require('dotenv').config();
const { S3Client } = require('@aws-sdk/client-s3');

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'autoscope-specimen-scans';
const AWS_S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || null;
const AWS_S3_FORCE_PATH_STYLE = process.env.AWS_S3_FORCE_PATH_STYLE === 'true';
const USE_S3_MOCK = process.env.USE_S3_MOCK === 'true' || !process.env.AWS_ACCESS_KEY_ID;

const clientConfig = {
  region: AWS_REGION,
};

if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  };
}

if (AWS_S3_ENDPOINT) {
  clientConfig.endpoint = AWS_S3_ENDPOINT;
}

if (AWS_S3_FORCE_PATH_STYLE) {
  clientConfig.forcePathStyle = true;
}

const s3Client = new S3Client(clientConfig);

module.exports = {
  s3Client,
  AWS_REGION,
  AWS_S3_BUCKET_NAME,
  USE_S3_MOCK,
};
