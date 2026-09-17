const { Queue, QueueEvents } = require('bullmq');
const { redisConnection } = require('../configs/redis.config');

const IMAGE_PROCESSING_QUEUE = 'image-processing';

const imageProcessingQueue = new Queue(IMAGE_PROCESSING_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 200,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

const queueEvents = new QueueEvents(IMAGE_PROCESSING_QUEUE, {
  connection: redisConnection,
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[BullMQ Event] Job ${jobId} completed successfully.`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[BullMQ Event] Job ${jobId} failed. Reason: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`[BullMQ Event] Job ${jobId} progress: ${data}%`);
});

class QueueService {
  /**
   * Enqueue an assembled image processing task into BullMQ
   * @param {string} uploadId - MongoDB ImageUpload ID
   * @param {object} payload - Job payload
   */
  async enqueueImageProcessing(uploadId, payload = {}) {
    const job = await imageProcessingQueue.add(
      'process-specimen-scan',
      {
        uploadId,
        enqueuedAt: new Date().toISOString(),
        ...payload,
      },
      {
        jobId: `job-${uploadId}`,
      }
    );

    console.log(`[BullMQ Producer] Enqueued job '${job.id}' for upload '${uploadId}'`);
    return job;
  }

  /**
   * Check status and progress of a specific BullMQ job
   * @param {string} jobId
   */
  async getJobStatus(jobId) {
    const job = await imageProcessingQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState(); // waiting | active | completed | failed | delayed
    const progress = job.progress;

    return {
      id: job.id,
      name: job.name,
      state,
      progress,
      failedReason: job.failedReason || null,
      returnvalue: job.returnvalue || null,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }

  /**
   * Get queue health metrics
   */
  async getQueueMetrics() {
    const counts = await imageProcessingQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );
    return {
      queueName: IMAGE_PROCESSING_QUEUE,
      status: 'UP',
      counts,
    };
  }
}

module.exports = new QueueService();
