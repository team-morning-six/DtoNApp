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

const fetchDiscord = async () => {
    return await axios
        .get(DISCORD_API_BASEURL + 'channels/1149914100084785265/messages', {
            headers: { Authorization: 'Bot ' + DISCORD_API_TOKEN },
        })
        .then((response) => response.data[0])
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
    console.log(response.data);
};

// todo: あとで直す
const USER_TAG = {
    yano_20: '9541fd67-5883-4ac9-9622-3befca571fd3',
    ryuji_takagi: 'd518a621-96b1-4d50-ae12-56cfa36362b4',
    yunosuke924: '05c7ac21-5185-4296-8f5e-3e53972b0010',
    hagayuuki: 'a0b024eb-a321-41b4-b7a7-d1023f8ad052',
};

type USER_TAG_KEY_TYPE = keyof typeof USER_TAG;

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const message = await fetchDiscord();
        const userName = message.author.username as USER_TAG_KEY_TYPE;

        // todo: あとで直す
        const postTitle = '仮のタイトルです';
        const postUserId = USER_TAG[userName];
        const postDescription = message.content;

        createNotionPage(postTitle, postUserId, postDescription);

        return {
            statusCode: 200,
            body: JSON.stringify(
                decycle({
                    postDescription,
                    userName,
                }),
            ),
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
