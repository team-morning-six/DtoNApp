import { PostDtoNUseCase } from './usecases';

export const lambdaHandler = async () => {
  try {
    await PostDtoNUseCase.execute();

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
