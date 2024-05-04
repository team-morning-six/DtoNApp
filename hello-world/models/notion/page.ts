import axios from 'axios';

export class Page {
  private static NOTION_API_KEY = process.env.NotionApiKey;
  private static NOTION_VERSION = '2022-06-28';
  private static NOTION_TITLE_PROPERTY = '投稿タイトル';
  private static NOTION_BASE_URL = 'https://api.notion.com/v1';

  title = '';
  body = '';
  author = {
    id: '',
    databaseId: '',
  };

  constructor(data: Partial<Page> = {}) {
    Object.assign(this, data);
  }

  async post() {
    const headers = {
      Authorization: `Bearer ${Page.NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': Page.NOTION_VERSION,
    };

    const data = {
      parent: { type: 'database_id', database_id: this.author.databaseId },
      properties: {
        [Page.NOTION_TITLE_PROPERTY]: {
          title: [
            {
              type: 'text',
              text: {
                content: this.title,
              },
            },
          ],
        },
        タグ: {
          id: 'jERN',
          type: 'people',
          people: [
            {
              object: 'user',
              id: this.author.id,
            },
          ],
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: this.body,
                },
              },
            ],
          },
        },
      ],
    };

    await axios.post(Page.NOTION_BASE_URL + '/pages', data, { headers });
  }
}
