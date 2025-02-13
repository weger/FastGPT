import type { NextApiResponse } from 'next';
import { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { InitDateResponse } from '@/global/common/api/systemRes';
import { SystemModelItemType } from '@fastgpt/service/core/ai/type';

async function handler(
  req: ApiRequestProps<{}, { bufferId?: string }>,
  res: NextApiResponse
): Promise<InitDateResponse> {
  const { bufferId } = req.query;

  const activeModelList = global.systemActiveModelList.map((model) => ({
    ...model,
    customCQPrompt: undefined,
    customExtractPrompt: undefined,
    defaultSystemChatPrompt: undefined,
    fieldMap: undefined,
    defaultConfig: undefined,
    weight: undefined,
    dbConfig: undefined,
    queryConfig: undefined,
    requestUrl: undefined,
    requestAuth: undefined
  })) as SystemModelItemType[];

  // If bufferId is the same as the current bufferId, return directly
  if (bufferId && global.systemInitBufferId && global.systemInitBufferId === bufferId) {
    return {
      bufferId: global.systemInitBufferId,
      systemVersion: global.systemVersion || '0.0.0'
    }
  });
}

const defaultFeConfigs: FastGPTFeConfigsType = {
  show_emptyChat: true,
  show_git: true,
  docUrl: 'https://doc.fastgpt.in',
  openAPIDocUrl: 'https://doc.fastgpt.in/docs/development/openapi',
  systemTitle: 'YiLiao.AI',
  concatMd: '关于我们: [YiLiao.AI](https://dataclubs.com/#about)',
  limit: {
    exportDatasetLimitMinutes: 0,
    websiteSyncLimitMinuted: 0
  },
  scripts: [],
  favicon: '/favicon.ico',
  uploadFileMaxSize: 500
};

export async function getInitConfig() {
  if (global.systemInitd) return;
  global.systemInitd = true;

  try {
    await connectToDatabase();

    await Promise.all([
      initSystemConfig(),
      // getSimpleModeTemplates(),
      getSystemVersion(),
      getSystemPlugin(),

      // abandon
      getSystemPluginV1()
    ]);

    console.log({
      communityPlugins: global.communityPlugins
    });
  } catch (error) {
    console.error('Load init config error', error);
    global.systemInitd = false;

    if (!global.feConfigs) {
      exit(1);
    }
  }
}

export async function initSystemConfig() {
  // load config
  const [dbConfig, fileConfig] = await Promise.all([
    getFastGPTConfigFromDB(),
    readConfigData('config.json')
  ]);
  const fileRes = JSON.parse(fileConfig) as FastGPTConfigFileType;

  // get config from database
  const config: FastGPTConfigFileType = {
    feConfigs: {
      ...fileRes?.feConfigs,
      ...defaultFeConfigs,
      ...(dbConfig.feConfigs || {}),
      isPlus: !!FastGPTProUrl
    },
    systemEnv: {
      ...fileRes.systemEnv,
      ...(dbConfig.systemEnv || {})
    },
    subPlans: dbConfig.subPlans || fileRes.subPlans,
    llmModels: dbConfig.llmModels || fileRes.llmModels || [],
    vectorModels: dbConfig.vectorModels || fileRes.vectorModels || [],
    reRankModels: dbConfig.reRankModels || fileRes.reRankModels || [],
    audioSpeechModels: dbConfig.audioSpeechModels || fileRes.audioSpeechModels || [],
    whisperModel: dbConfig.whisperModel || fileRes.whisperModel
  };

  // set config
  initFastGPTConfig(config);

  console.log({
    feConfigs: global.feConfigs,
    subPlans: global.subPlans,
    systemVersion: global.systemVersion || '0.0.0',
    activeModelList,
    defaultModels: global.systemDefaultModel
  };
}

export default NextAPI(handler);
