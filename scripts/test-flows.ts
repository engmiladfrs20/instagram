import assert from 'node:assert/strict';
import { isFollowClaimText, matchesAutomation, executableNodes, runtimeVersion } from '../src/lib/automationEngine';
import { SAMPLE_AUTOMATION_ID, INITIAL_AUTOMATIONS } from '../src/lib/mockData';
import { getWebhookIdentity } from '../src/lib/webhookDedupe';
import { isOwnInstagramComment, splitInstagramWebhookPayload } from '../src/lib/instagramWebhook';
import { getInstagramUserProfile, replyToInstagramComment, sendInstagramMessage } from '../src/lib/metaClient';

const sample = structuredClone(INITIAL_AUTOMATIONS.find((item) => item.id === SAMPLE_AUTOMATION_ID)!);

assert.equal(isFollowClaimText(' فالو دارم '), true);
assert.equal(isFollowClaimText('فالو کردم'), true);
assert.equal(isFollowClaimText('قیمت'), false);

const commentContext = {
  trigger: 'COMMENT_CREATED' as const,
  text: 'قیمت لطفاً',
  payload: {},
  mediaId: 'media_1',
  windowOpen: false,
};
assert.equal(matchesAutomation(sample, commentContext), true);
assert.deepEqual(
  executableNodes(runtimeVersion(sample, commentContext), commentContext).map((node) => node.id),
  ['sample_public_reply', 'sample_follow_gate'],
);

const followContext = {
  trigger: 'QUICK_REPLY_SELECTED' as const,
  text: 'فالو دارم',
  payload: {},
  replyPayload: 'FOLLOW_CLAIMED:sample',
  isFollower: true,
  windowOpen: true,
};
assert.equal(matchesAutomation(sample, followContext), true);
assert.deepEqual(
  executableNodes(runtimeVersion(sample, followContext), followContext).map((node) => node.id),
  ['sample_follow_success', 'sample_follow_content', 'sample_add_tag'],
);

const batchedPayload = {
  object: 'instagram',
  entry: [{
    id: 'ig_business',
    changes: [{ field: 'comments', value: { id: 'comment_1' } }],
    messaging: [{ sender: { id: 'igsid_1' }, recipient: { id: 'ig_business' }, postback: { mid: 'mid_1', title: 'فالو دارم', payload: 'FOLLOW_CLAIMED:sample' } }],
  }],
};
const split = splitInstagramWebhookPayload(batchedPayload);
assert.equal(split.length, 2);
assert.equal(getWebhookIdentity(split[0]).eventType, 'comments');
assert.equal(getWebhookIdentity(split[0]).externalId, 'comment_1');
assert.equal(getWebhookIdentity(split[1]).eventType, 'messaging_postbacks');
assert.equal(getWebhookIdentity(split[1]).externalId, 'mid_1');

const concurrentIdentities = Array.from({ length: 200 }, (_, index) => getWebhookIdentity({
  object: 'instagram',
  entry: [{
    id: 'ig_business',
    messaging: [{
      sender: { id: `igsid_${index}` },
      recipient: { id: 'ig_business' },
      message: { mid: `mid_concurrent_${index}`, text: 'سلام' },
    }],
  }],
}));
assert.equal(new Set(concurrentIdentities.map((identity) => identity.dedupeKey)).size, 200);
assert.equal(
  getWebhookIdentity({ object: 'instagram', entry: [{ id: 'ig_business', messaging: [{ message: { mid: 'same_mid' } }] }] }).dedupeKey,
  getWebhookIdentity({ object: 'instagram', entry: [{ id: 'ig_business', messaging: [{ message: { mid: 'same_mid' } }] }] }).dedupeKey,
);

assert.equal(isOwnInstagramComment({ senderUsername: '@USDHunter.ir', connectedUsername: 'usdhunter.ir' }), true);
assert.equal(isOwnInstagramComment({ senderId: '1', connectedAccountId: '2', senderUsername: 'customer', connectedUsername: 'usdhunter.ir' }), false);

const calls: Array<{ url: string; init?: RequestInit }> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  calls.push({ url: String(input), init });
  return new Response(JSON.stringify({ recipient_id: 'igsid_1', message_id: `mid_${calls.length}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}) as typeof fetch;

try {
  await sendInstagramMessage({
    accessToken: 'secret-token',
    instagramUserId: 'ig_business',
    recipientId: 'igsid_1',
    content: { text: 'ادامه', quickReplies: [{ title: 'فالو دارم', payload: 'FOLLOW_CLAIMED:sample' }] },
  });
  const quickReplyCall = calls.at(-1)!;
  const quickReplyBody = JSON.parse(String(quickReplyCall.init?.body));
  assert.equal(quickReplyCall.url.includes('access_token='), false);
  assert.equal(new Headers(quickReplyCall.init?.headers).get('Authorization'), 'Bearer secret-token');
  assert.equal(quickReplyBody.messaging_type, 'RESPONSE');
  assert.deepEqual(quickReplyBody.message.quick_replies, [{ content_type: 'text', title: 'فالو دارم', payload: 'FOLLOW_CLAIMED:sample' }]);

  await sendInstagramMessage({
    accessToken: 'secret-token',
    instagramUserId: 'ig_business',
    commentId: 'comment_1',
    content: { text: 'ابتدا پیج را فالو کنید.', buttons: [{ title: 'فالو دارم', payload: 'FOLLOW_CLAIMED:sample' }] },
  });
  const privateReplyBody = JSON.parse(String(calls.at(-1)!.init?.body));
  assert.deepEqual(privateReplyBody, {
    recipient: { comment_id: 'comment_1' },
    message: { text: 'ابتدا پیج را فالو کنید.' },
  });

  await getInstagramUserProfile({
    accessToken: 'secret-token',
    graphHost: 'graph.instagram.com',
    graphVersion: 'v23.0',
    userId: 'igsid_1',
    includeFollowStatus: true,
  });
  const followProfileCall = calls.at(-1)!;
  assert.equal(followProfileCall.url.includes('is_user_follow_business'), true);
  assert.equal(followProfileCall.url.includes('is_business_follow_user'), false);
  assert.equal(new Headers(followProfileCall.init?.headers).get('Authorization'), 'Bearer secret-token');

  await replyToInstagramComment({
    accessToken: 'secret-token',
    commentId: 'comment_1',
    text: 'یک پاسخ عمومی',
  });
  const publicReplyCall = calls.at(-1)!;
  assert.equal(publicReplyCall.url.includes('access_token='), false);
  assert.equal(new Headers(publicReplyCall.init?.headers).get('Authorization'), 'Bearer secret-token');
} finally {
  globalThis.fetch = originalFetch;
}

console.log('Flow validation passed: follow gate, 200-event identity load, postback, batching, self-comment guard and Meta request bodies.');
