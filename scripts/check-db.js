require('dotenv').config();
const mongoose = require('mongoose');
const ApiUrl = require('../src/models/ApiUrl');
const ApiVersion = require('../src/models/ApiVersion');

const checkDatabase = async () => {
  try {
    console.log('🔍 데이터베이스 연결 중...');
    console.log(`MongoDB URI: ${process.env.MONGODB_URI || '환경 변수가 설정되지 않았습니다'}`);

    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB 연결 성공\n');

    // ApiUrl 컬렉션 확인
    const urlCount = await ApiUrl.countDocuments();
    console.log(`📊 ApiUrl 컬렉션: ${urlCount}개 문서`);

    if (urlCount > 0) {
      const urls = await ApiUrl.find().select('name url group lastFetchStatus versionCount').limit(10);
      console.log('\n📋 API URL 목록 (최대 10개):');
      urls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url.name}`);
        console.log(`     URL: ${url.url}`);
        console.log(`     그룹: ${url.group}`);
        console.log(`     상태: ${url.lastFetchStatus}`);
        console.log(`     버전 수: ${url.versionCount}`);
        console.log('');
      });

      if (urlCount > 10) {
        console.log(`  ... 외 ${urlCount - 10}개 더 있음\n`);
      }
    }

    // ApiVersion 컬렉션 확인
    const versionCount = await ApiVersion.countDocuments();
    console.log(`📊 ApiVersion 컬렉션: ${versionCount}개 문서`);

    if (versionCount > 0) {
      const versions = await ApiVersion.find()
        .select('versionId urlId createdAt')
        .populate('urlId', 'name url')
        .limit(10)
        .sort({ createdAt: -1 });

      console.log('\n📋 버전 목록 (최대 10개, 최신순):');
      versions.forEach((version, index) => {
        console.log(`  ${index + 1}. ${version.urlId?.name || 'Unknown'} - ${version.versionId}`);
        console.log(`     생성일: ${version.createdAt}`);
        console.log('');
      });

      if (versionCount > 10) {
        console.log(`  ... 외 ${versionCount - 10}개 더 있음\n`);
      }
    }

    // 그룹별 통계
    if (urlCount > 0) {
      const groupStats = await ApiUrl.aggregate([
        {
          $group: {
            _id: '$group',
            count: { $sum: 1 },
            avgVersions: { $avg: '$versionCount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      console.log('📈 그룹별 통계:');
      groupStats.forEach(stat => {
        console.log(`  ${stat._id}: ${stat.count}개 API, 평균 ${stat.avgVersions.toFixed(1)}개 버전`);
      });
    }

    if (urlCount === 0 && versionCount === 0) {
      console.log('\n⚠️  데이터베이스가 비어있습니다.');
    } else {
      console.log(`\n✅ 총 ${urlCount}개 API URL, ${versionCount}개 버전이 있습니다.`);
    }

    await mongoose.connection.close();
    console.log('\n✅ 데이터베이스 연결 종료');
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
};

checkDatabase();
