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

const filterMessagesLast24Hours = (messages: any[]) => {
  const twentyFourHoursAgo = dayjs().subtract(24, 'hour');

  return messages.filter((message) => {
    const messageTime = dayjs(message.timestamp);
    return messageTime.isAfter(twentyFourHoursAgo);
  });
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

const createNotionPage = async (postTitle: string, postUserId: string, postDescription: string, databaseId: string) => {
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
              content: postTitle,
            },
          },
        ],
      },
      // タグ: {
      //     id: 'jERN',
      //     type: 'people',
      //     people: [
      //         {
      //             object: 'user',
      //             id: postUserId,
      //         },
      //     ],
      // },
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
                content: postDescription,
              },
            },
          ],
        },
      },
    ],
  };

  const response = await axios.post(NOTION_BASE_URL + '/pages', data, { headers });
};

// todo: あとで直す
const USER_TAG = {
  yano_20: '9541fd67-5883-4ac9-9622-3befca571fd3',
  ryuji_takagi: 'd518a621-96b1-4d50-ae12-56cfa36362b4',
  yunosuke924: '05c7ac21-5185-4296-8f5e-3e53972b0010',
  hagayuuki: 'a0b024eb-a321-41b4-b7a7-d1023f8ad052',
};

type USER_TAG_KEY_TYPE = keyof typeof USER_TAG;

export const lambdaHandler = async () => {
  try {
    const discord_channel_ids = Object.values(DISCORD_CHANNEL_ID);
    const discord_messages = await Promise.all(
      discord_channel_ids.map(async (channelId) => await fetchDiscordMessages(channelId)),
    ).then((results) => results.flat());

    const postNotion = async (discord_messages: any) => {
      const filteredMessages = filterMessagesLast24Hours(discord_messages);
      for (const message of filteredMessages) {
        const userName = message.author.username as USER_TAG_KEY_TYPE;
        const databaseId = process.env.AWS_SAM_LOCAL ? NOTION_DEV_DATABASE_ID : USER_DATABASE_MAP[userName];

        const isTitleIncluded = message.content.includes('-t');
        const isDescriptionIncluded = message.content.includes('-d');
        let postTitle;
        let postDescription = '';

        if (!isTitleIncluded && !isDescriptionIncluded) {
          continue;
        }

        if (isTitleIncluded && !isDescriptionIncluded) {
          postTitle = message.content.split('-t')[1].trim();
        }

        if (isDescriptionIncluded && !isTitleIncluded) {
          postDescription = message.content.split('-d')[1];
        }

        if (!postTitle) {
          postTitle = new Date().toISOString();
        }

        if (isTitleIncluded && isDescriptionIncluded) {
          postTitle = message.content.split('-t')[1].split('-d')[0].trim();
          postDescription = message.content.split('-d')[1];
        }

        const postUserId = USER_TAG[userName];

        await createNotionPage(postTitle, postUserId, postDescription, databaseId);
      }
    };

    await postNotion(discord_messages);

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
