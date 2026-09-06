import Parser from 'rss-parser';

// RSS 피드 목록
const RSS_FEEDS = [
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
  },
  {
    name: 'The Verge AI',
    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  },
];

const parser = new Parser();

// 단일 RSS 피드 파싱
async function parseFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return result.items.map((item) => ({
      guid: item.guid || item.link,
      originalTitle: item.title,
      originalSummary: item.contentSnippet || item.content || '',
      sourceUrl: item.link,
      sourceName: feed.name,
      imageUrl: item.enclosure?.url || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    }));
  } catch (error) {
    console.error(`RSS 파싱 실패 (${feed.name}):`, error.message);
    return [];
  }
}

// 모든 RSS 피드 병렬 수집
export async function fetchAllFeeds() {
  const results = await Promise.all(RSS_FEEDS.map(parseFeed));
  return results.flat();
}
