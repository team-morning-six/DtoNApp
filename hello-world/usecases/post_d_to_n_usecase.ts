import dayjs from 'dayjs';
import { Page as NotionPage, Message as DiscordMessage } from '~/models';

export class PostDtoNUseCase {
  private static DISCORD_CHANNEL_ID = {
    times_ryuji_takagi: '1140113011386880070',
    times_yunosuke_minegishi: '1149696633546756188',
    times_yuki_haga: '1149701115307376702',
    times_yano: '1149914100084785265',
  };

  private static PREFIX_MAP = {
    title: ['-t', '.t', '!', '！'],
    body: ['-d', '-b', '.b', '!', '！！'],
  };
  // TODO: PREFIX_MAPを用いていい感じにしたい
  private static TITLE_REGEX_PATTERN = /^(-t|!|！|.t)\s(.*?)\n/;
  private static BODY_REGEX_PATTERN = /(!!|-d|-b|！！|.b)\s/;

  // todo: あとで直す
  private static USER_TAG = {
    yano_20: '9541fd67-5883-4ac9-9622-3befca571fd3',
    ryuji_takagi: 'd518a621-96b1-4d50-ae12-56cfa36362b4',
    yunosuke924: '05c7ac21-5185-4296-8f5e-3e53972b0010',
    hagayuuki: 'a0b024eb-a321-41b4-b7a7-d1023f8ad052',
  };

  private static USER_DATABASE_MAP: Record<string, string> = {
    yano_20: '836d7fd6de5a4e289f31b832e73cefb5',
    ryuji_takagi: '2f9f13c2c3654acca9069513a51848b3',
    yunosuke924: 'c1b27e29eb6d4206be66c871f656dcdb',
    hagayuuki: 'adc921d9c5b84b2e918e0ba23a9802e8',
  };

  private static NOTION_DEV_DATABASE_ID = 'c7ad59deb9a641da839495c50c2241cf';

  static async execute() {
    const messages = await Promise.all(
      Object.values(this.DISCORD_CHANNEL_ID).map(async (channelId) => await DiscordMessage.fetchbyChannelId(channelId)),
    ).then((results) => results.flat());

    const postableMessages = this.filterMessagesLast24Hours(messages).filter((message) =>
      this.canPostMessageToNotion(message),
    );

    for (const message of postableMessages) {
      const notionPage = this.buildNotionPageByMessage(message);
      await notionPage.post();
    }
  }

  private static filterMessagesLast24Hours(messages: DiscordMessage[]) {
    const twentyFourHoursAgo = dayjs().subtract(24, 'hour');

    return messages.filter((message) => {
      const messageTime = dayjs(message.timestamp);
      return messageTime.isAfter(twentyFourHoursAgo);
    });
  }

  private static canPostMessageToNotion(message: DiscordMessage) {
    const isStartFromTitlePrefix = this.PREFIX_MAP.title.some((prefix) => message.content.startsWith(prefix));
    const isStartFromBodyPrefix = this.PREFIX_MAP.body.some((prefix) => message.content.startsWith(prefix));

    if (!isStartFromTitlePrefix && !isStartFromBodyPrefix) {
      return false;
    }

    return true;
  }

  private static buildNotionPageByMessage = (message: DiscordMessage) => {
    const title = this.TITLE_REGEX_PATTERN.exec(message.content)?.[2] ?? new Date().toISOString();
    const body = message.content.split(this.BODY_REGEX_PATTERN).at(-1) ?? '';
    const authorName = message.author.username as keyof typeof this.USER_TAG;
    const authorId = this.USER_TAG[authorName];
    const authorDatabaseId = process.env.AWS_SAM_LOCAL
      ? this.NOTION_DEV_DATABASE_ID
      : this.USER_DATABASE_MAP[authorName];

    return new NotionPage({
      title,
      body,
      author: {
        id: authorId,
        databaseId: authorDatabaseId,
      },
    });
  };
}
