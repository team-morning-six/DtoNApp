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

const API_BASEURL = 'https://discordapp.com/api/';
const API_TOKEN = 'MTIxODc1NDIwODk3MTYyNDUwOQ.G6r3cB.qgjAPqA0jSX4OdtUXXtEzi45CMW73S8Na8ne2Q';

const fetchDiscord = async () => {
    return await axios
        .get(API_BASEURL + 'channels/1149914100084785265/messages', { headers: { Authorization: 'Bot ' + API_TOKEN } })
        .then((response) => response.data[0])
        .catch((error) => {
            console.log(error);
        });
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        const message = await fetchDiscord();
        const content = message.content;
        const userName = message.author.username;
        return {
            statusCode: 200,
            body: JSON.stringify(
                decycle({
                    content,
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
