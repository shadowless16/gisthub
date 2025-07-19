// Script to backfill notifications for all existing likes and comments on user's posts
// Run this with: `node scripts/backfill-notifications.js`

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'gisthub';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const posts = await db.collection('posts').find({}).toArray();
  const users = await db.collection('users').find({}).toArray();
  const usersMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
  const notificationsCollection = db.collection('notifications');
  let createdCount = 0;

  for (const post of posts) {
    // Backfill likes
    if (Array.isArray(post.likes)) {
      for (const likeUserId of post.likes) {
        // Don't notify if user liked their own post
        if (post.userId && likeUserId.toString() === post.userId.toString()) continue;
        // Check if notification already exists
        const exists = await notificationsCollection.findOne({
          userId: post.userId,
          type: 'like',
          'fromUser._id': new ObjectId(likeUserId),
          link: `/post/${post._id}`
        });
        if (!exists) {
          const fromUser = usersMap[likeUserId.toString()];
          await notificationsCollection.insertOne({
            userId: post.userId,
            type: 'like',
            fromUser: {
              name: fromUser?.username || '',
              avatar: fromUser?.profilePic || '',
              _id: fromUser?._id,
            },
            message: `${fromUser?.username || 'Someone'} liked your post`,
            link: `/post/${post._id}`,
            read: false,
            createdAt: post.createdAt || new Date(),
          });
          createdCount++;
        }
      }
    }
    // Backfill comments
    const comments = await db.collection('comments').find({ postId: post._id }).toArray();
    for (const comment of comments) {
      // Don't notify if user commented on their own post
      if (post.userId && comment.userId.toString() === post.userId.toString()) continue;
      // Check if notification already exists
      const exists = await notificationsCollection.findOne({
        userId: post.userId,
        type: 'comment',
        'fromUser._id': new ObjectId(comment.userId),
        link: `/post/${post._id}`
      });
      if (!exists) {
        const fromUser = usersMap[comment.userId.toString()];
        await notificationsCollection.insertOne({
          userId: post.userId,
          type: 'comment',
          fromUser: {
            name: fromUser?.username || '',
            avatar: fromUser?.profilePic || '',
            _id: fromUser?._id,
          },
          message: `${fromUser?.username || 'Someone'} commented on your post`,
          link: `/post/${post._id}`,
          read: false,
          createdAt: comment.createdAt || new Date(),
        });
        createdCount++;
      }
    }
  }
  console.log(`Backfill complete. Created ${createdCount} notifications.`);
  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
