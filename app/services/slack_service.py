import logging
from typing import Any

from slack_sdk.errors import SlackApiError
from slack_sdk.web.async_client import AsyncWebClient

from app.config import settings

logger = logging.getLogger(__name__)

_slack_client: AsyncWebClient | None = None
if settings.slack_enabled and settings.slack_bot_token:
    _slack_client = AsyncWebClient(token=settings.slack_bot_token)


async def find_user_by_email(email: str | None) -> str | None:
    if not _slack_client or not email:
        return None

    try:
        response = await _slack_client.users_lookupByEmail(email=email)
        if response.get("ok") and response.get("user"):
            return response["user"]["id"]
        return None
    except SlackApiError as error:
        if error.response and error.response.get("error") == "users_not_found":
            logger.info("[Slack] 사용자를 찾을 수 없습니다: %s", email)
            return None
        logger.error("[Slack] 사용자 조회 실패: %s", error)
        return None
    except Exception as error:
        logger.error("[Slack] 사용자 조회 실패: %s", error)
        return None


async def send_direct_message(user_id: str | None, message: dict[str, Any]) -> bool:
    if not _slack_client or not user_id:
        return False

    try:
        conversation = await _slack_client.conversations_open(users=user_id)
        if not conversation.get("ok") or not conversation.get("channel"):
            logger.error("[Slack] DM 채널 열기 실패: %s", conversation.get("error"))
            return False

        channel_id = conversation["channel"]["id"]
        response = await _slack_client.chat_postMessage(channel=channel_id, **message)
        if not response.get("ok"):
            logger.error("[Slack] 메시지 전송 실패: %s", response.get("error"))
            return False

        return True
    except SlackApiError as error:
        logger.error("[Slack] DM 전송 중 오류: %s", error)
        return False
    except Exception as error:
        logger.error("[Slack] DM 전송 중 오류: %s", error)
        return False


def format_change_notification(
    api_name: str,
    api_url: str,
    version_id: str,
    changes_count: int,
    summary: str,
    is_new_version: bool,
    detail_url: str | None = None,
) -> dict[str, Any]:
    emoji = "🆕" if is_new_version else "🔄"
    action = "새 버전이 생성되었습니다" if is_new_version else "변경사항이 감지되었습니다"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{emoji} API 변경사항 알림",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*API 이름:*\n{api_name}"},
                {"type": "mrkdwn", "text": f"*버전:*\n{version_id}"},
                {"type": "mrkdwn", "text": f"*상태:*\n{action}"},
                {"type": "mrkdwn", "text": f"*변경사항 수:*\n{changes_count}개"},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*변경사항 요약:*\n{summary or '변경사항 없음'}",
            },
        },
    ]

    if detail_url:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"<{detail_url}|상세 변경사항 보기>",
                },
            }
        )

    blocks.append(
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"API URL: {api_url}",
                }
            ],
        }
    )

    return {
        "text": f"{emoji} {api_name} - {action}",
        "blocks": blocks,
    }


async def send_change_notification(
    owner_email: str | None,
    api_name: str,
    api_url: str,
    api_id: str,
    version_id: str,
    changes_count: int,
    summary: str,
    is_new_version: bool,
    base_url: str | None = None,
) -> bool:
    if not settings.slack_enabled:
        return False

    if not owner_email:
        logger.info("[Slack] 담당자 이메일이 없어 알림을 전송하지 않습니다: %s", api_name)
        return False

    if not _slack_client:
        return False

    try:
        user_id = await find_user_by_email(owner_email)
        if not user_id:
            logger.info("[Slack] 슬랙 사용자를 찾을 수 없어 알림을 전송하지 않습니다: %s", owner_email)
            return False

        detail_url = f"{(base_url or settings.resolved_base_url)}/api-detail?id={api_id}"
        message = format_change_notification(
            api_name=api_name,
            api_url=api_url,
            version_id=version_id,
            changes_count=changes_count,
            summary=summary,
            is_new_version=is_new_version,
            detail_url=detail_url,
        )

        success = await send_direct_message(user_id, message)
        if success:
            logger.info("[Slack] 알림 전송 성공: %s -> %s", api_name, owner_email)
        return success
    except Exception as error:
        logger.error("[Slack] 알림 전송 중 오류: %s", error)
        return False
