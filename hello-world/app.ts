import axios from 'axios';
import dayjs from 'dayjs';

const DISCORD_API_BASEURL = 'https://discordapp.com/api/';
const DISCORD_API_TOKEN = process.env.DiscordApiToken;

const DISCORD_CHANNEL_ID = {
  times_ryuji_takagi: '1140113011386880070',
  times_yunosuke_minegishi: '1149696633546756188',
  times_yuki_haga: '1149701115307376702',
  times_yano: '1149914100084785265',
};

const NOTION_API_KEY = process.env.NotionApiKey;
const NOTION_VERSION = '2022-06-28';
const NOTION_DEV_DATABASE_ID = 'c7ad59deb9a641da839495c50c2241cf';
const USER_DATABASE_MAP: Record<string, string> = {
  yano_20: '836d7fd6de5a4e289f31b832e73cefb5',
  ryuji_takagi: '2f9f13c2c3654acca9069513a51848b3',
  yunosuke924: 'c1b27e29eb6d4206be66c871f656dcdb',
  hagayuuki: 'adc921d9c5b84b2e918e0ba23a9802e8',
};
const NOTION_TITLE_PROPERTY = '投稿タイトル';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

// todo: あとで直す
const USER_TAG = {
  yano_20: '9541fd67-5883-4ac9-9622-3befca571fd3',
  ryuji_takagi: 'd518a621-96b1-4d50-ae12-56cfa36362b4',
  yunosuke924: '05c7ac21-5185-4296-8f5e-3e53972b0010',
  hagayuuki: 'a0b024eb-a321-41b4-b7a7-d1023f8ad052',
};

type USER_TAG_KEY_TYPE = keyof typeof USER_TAG;

const PREFIX_MAP = {
  title: ['-t', '.t', '!', '！'],
  body: ['-d', '-b', '.b', '!', '！！'],
};

// TODO: PREFIX_MAPを用いていい感じにしたい
const TITLE_REGEX_PATTERN = /^(-t|!|！|.t)\s(.*?)\n/;
const BODY_REGEX_PATTERN = /(!!|-d|-b|！！|.b)\s/;

type Message = {
  id: string;
  content: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
  };
};

const fetchDiscordMessages = async (channelId: string) => {
  return await axios
    .get(`${DISCORD_API_BASEURL}channels/${channelId}/messages`, {
      headers: { Authorization: 'Bot ' + DISCORD_API_TOKEN },
    })
    .then((response) => response.data)
    .catch((error) => {
      console.log(error);
    });
};

const filterMessagesLast24Hours = (messages: Message[]) => {
  const twentyFourHoursAgo = dayjs().subtract(24, 'hour');

  return messages.filter((message) => {
    const messageTime = dayjs(message.timestamp);
    return messageTime.isAfter(twentyFourHoursAgo);
  });
};

const createNotionPage = async (title: string, body: string, postUserId: string, databaseId: string) => {
  const headers = {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };

  const data = {
    parent: { type: 'database_id', database_id: databaseId },
    properties: {
      [NOTION_TITLE_PROPERTY]: {
        title: [
          {
            type: 'text',
            text: {
              content: title,
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
            id: postUserId,
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
                content: body,
              },
            },
          ],
        },
      },
    ],
  };

  await axios.post(NOTION_BASE_URL + '/pages', data, { headers });
};

const postNotion = async (messages: Message[]) => {
  const filteredMessages = filterMessagesLast24Hours(messages);

  for (const message of filteredMessages) {
    const userName = message.author.username as USER_TAG_KEY_TYPE;
    const postUserId = USER_TAG[userName];
    const databaseId = process.env.AWS_SAM_LOCAL ? NOTION_DEV_DATABASE_ID : USER_DATABASE_MAP[userName];

    const isTitleIncluded = PREFIX_MAP.title.some((prefix) => message.content.startsWith(prefix));
    const isStartFromBodyPrefix = PREFIX_MAP.body.some((prefix) => message.content.startsWith(prefix));

    if (!isTitleIncluded && !isStartFromBodyPrefix) {
      continue;
    }

    const title = TITLE_REGEX_PATTERN.exec(message.content)?.[2] ?? new Date().toISOString();
    const body = message.content.split(BODY_REGEX_PATTERN).at(-1) ?? '';

    await createNotionPage(title, body, postUserId, databaseId);
  }
};

export const lambdaHandler = async () => {
  try {
    const messages = await Promise.all(
      Object.values(DISCORD_CHANNEL_ID).map(async (channelId) => await fetchDiscordMessages(channelId)),
    ).then((results) => results.flat());

    await postNotion(messages);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'some error happened',
      }),
    };
  }
};
