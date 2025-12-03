const { WebClient } = require('@slack/web-api');

// Slack Bot Token 초기화
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackEnabled = process.env.SLACK_ENABLED === 'true';

let slackClient = null;

if (slackEnabled && slackToken) {
  slackClient = new WebClient(slackToken);
}

/**
 * 이메일로 슬랙 사용자 ID 조회
 * @param {string} email - 사용자 이메일
 * @returns {Promise<string|null>} 슬랙 사용자 ID 또는 null
 */
async function findUserByEmail(email) {
  if (!slackClient || !email) {
    return null;
  }

  try {
    const response = await slackClient.users.lookupByEmail({ email });
    if (response.ok && response.user) {
      return response.user.id;
    }
    return null;
  } catch (error) {
    // 사용자를 찾을 수 없는 경우 등은 에러로 처리하지 않음
    if (error.data?.error === 'users_not_found') {
      console.log(`[Slack] 사용자를 찾을 수 없습니다: ${email}`);
      return null;
    }
    console.error(`[Slack] 사용자 조회 실패: ${email}`, error.message);
    return null;
  }
}

/**
 * 개인 DM 전송
 * @param {string} userId - 슬랙 사용자 ID
 * @param {object} message - 메시지 객체 (blocks 또는 text)
 * @returns {Promise<boolean>} 전송 성공 여부
 */
async function sendDirectMessage(userId, message) {
  if (!slackClient || !userId) {
    return false;
  }

  try {
    // DM 채널 열기
    const conversationResponse = await slackClient.conversations.open({
      users: userId,
    });

    if (!conversationResponse.ok || !conversationResponse.channel) {
      console.error('[Slack] DM 채널 열기 실패:', conversationResponse.error);
      return false;
    }

    const channelId = conversationResponse.channel.id;

    // 메시지 전송
    const postResponse = await slackClient.chat.postMessage({
      channel: channelId,
      ...message,
    });

    if (!postResponse.ok) {
      console.error('[Slack] 메시지 전송 실패:', postResponse.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Slack] DM 전송 중 오류:', error.message);
    return false;
  }
}

/**
 * 변경사항 알림 메시지 포맷팅
 * @param {object} options - 알림 옵션
 * @param {string} options.apiName - API 이름
 * @param {string} options.apiUrl - API URL
 * @param {string} options.versionId - 버전 ID
 * @param {number} options.changesCount - 변경사항 수
 * @param {string} options.summary - 변경사항 요약
 * @param {boolean} options.isNewVersion - 새 버전 생성 여부
 * @param {string} options.detailUrl - 상세 페이지 URL (선택사항)
 * @returns {object} Slack 메시지 포맷
 */
function formatChangeNotification({
  apiName,
  apiUrl,
  versionId,
  changesCount,
  summary,
  isNewVersion,
  detailUrl,
}) {
  const emoji = isNewVersion ? '🆕' : '🔄';
  const action = isNewVersion ? '새 버전이 생성되었습니다' : '변경사항이 감지되었습니다';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} API 변경사항 알림`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*API 이름:*\n${apiName}`,
        },
        {
          type: 'mrkdwn',
          text: `*버전:*\n${versionId}`,
        },
        {
          type: 'mrkdwn',
          text: `*상태:*\n${action}`,
        },
        {
          type: 'mrkdwn',
          text: `*변경사항 수:*\n${changesCount}개`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*변경사항 요약:*\n${summary || '변경사항 없음'}`,
      },
    },
  ];

  // 상세 페이지 링크가 있으면 추가
  if (detailUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${detailUrl}|상세 변경사항 보기>`,
      },
    });
  }

  // API URL 추가
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `API URL: ${apiUrl}`,
      },
    ],
  });

  return {
    text: `${emoji} ${apiName} - ${action}`,
    blocks,
  };
}

/**
 * API 변경사항 슬랙 알림 전송
 * @param {object} options - 알림 옵션
 * @param {string} options.ownerEmail - 담당자 이메일
 * @param {string} options.apiName - API 이름
 * @param {string} options.apiUrl - API URL
 * @param {string} options.apiId - API ID (상세 페이지 링크용)
 * @param {string} options.versionId - 버전 ID
 * @param {number} options.changesCount - 변경사항 수
 * @param {string} options.summary - 변경사항 요약
 * @param {boolean} options.isNewVersion - 새 버전 생성 여부
 * @param {string} options.baseUrl - 기본 URL (상세 페이지 링크 생성용)
 * @returns {Promise<boolean>} 전송 성공 여부
 */
async function sendChangeNotification({
  ownerEmail,
  apiName,
  apiUrl,
  apiId,
  versionId,
  changesCount,
  summary,
  isNewVersion,
  baseUrl = process.env.BASE_URL || 'http://localhost:3000',
}) {
  // 슬랙 알림이 비활성화되어 있으면 종료
  if (!slackEnabled) {
    return false;
  }

  // 담당자 이메일이 없으면 알림 전송 안 함
  if (!ownerEmail) {
    console.log(`[Slack] 담당자 이메일이 없어 알림을 전송하지 않습니다: ${apiName}`);
    return false;
  }

  try {
    // 이메일로 슬랙 사용자 ID 조회
    const userId = await findUserByEmail(ownerEmail);
    if (!userId) {
      console.log(`[Slack] 슬랙 사용자를 찾을 수 없어 알림을 전송하지 않습니다: ${ownerEmail}`);
      return false;
    }

    // 상세 페이지 URL 생성
    const detailUrl = `${baseUrl}/api-detail?id=${apiId}`;

    // 메시지 포맷팅
    const message = formatChangeNotification({
      apiName,
      apiUrl,
      versionId,
      changesCount,
      summary,
      isNewVersion,
      detailUrl,
    });

    // DM 전송
    const success = await sendDirectMessage(userId, message);
    if (success) {
      console.log(`[Slack] 알림 전송 성공: ${apiName} -> ${ownerEmail}`);
    }
    return success;
  } catch (error) {
    console.error(`[Slack] 알림 전송 중 오류: ${apiName}`, error.message);
    return false;
  }
}

module.exports = {
  sendChangeNotification,
  findUserByEmail,
  sendDirectMessage,
  formatChangeNotification,
};
