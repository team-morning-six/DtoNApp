import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import axios from 'axios';
import { decycle } from 'json-cyclic';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

const DISCORD_API_BASEURL = 'https://discordapp.com/api/';
const DISCORD_API_TOKEN = process.env.DISCORD_API_TOKEN;

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

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_VERSION = '2022-06-28';
const NOTION_DATABASE_ID = 'c7ad59de-b9a6-41da-8394-95c50c2241cf';
const NOTION_TITLE_PROPERTY = '投稿タイトル';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

const createNotionPage = async (postTitle: string, postUserId: string, postDescription: string) => {
    const headers = {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
    };

    const data = {
        parent: { type: 'database_id', database_id: NOTION_DATABASE_ID },
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

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult | undefined> => {
    try {
        const discord_channel_ids = Object.values(DISCORD_CHANNEL_ID);
        const discord_messages = await Promise.all(discord_channel_ids.map(async (channelId) => await fetchDiscordMessages(channelId))).then(results => results.flat());

        const postNotion = async (discord_messages: any) => {
            for (const message of discord_messages) {
                const userName = message.author.username as USER_TAG_KEY_TYPE;

                const isTitleIncluded = message.content.includes('-t');
                const isDescriptionIncluded = message.content.includes('-d');
                let postTitle;
                let postDescription = '';

                if (!isTitleIncluded && !isDescriptionIncluded) {
                    continue
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

                await createNotionPage(postTitle, postUserId, postDescription);
            }
        }

        await postNotion(discord_messages);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" }),
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
