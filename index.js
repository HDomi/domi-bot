const {
  Client,
  Events,
  Collection,
  GatewayIntentBits,
  Routes,
} = require("discord.js");
const { REST } = require("@discordjs/rest");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
if (!token || !clientId) {
  console.warn(
    "⚠️ 실행 안내: .env 파일에 DISCORD_TOKEN과 CLIENT_ID가 빈칸입니다. 설정 후 다시 구동해주세요.",
  );
}

const rest = new REST({ version: "10" }).setToken(token);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const commands = [];

// commands 폴더 생성 확인 및 명령어 로드
const commandsPath = path.join(__dirname, "commands");
if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath);
}

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const commandModule = require(filePath);

  if (Array.isArray(commandModule)) {
    for (const command of commandModule) {
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
    }
  } else if (commandModule.data && commandModule.execute) {
    client.commands.set(commandModule.data.name, commandModule);
    commands.push(commandModule.data.toJSON());
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`🤖 ${readyClient.user.tag} 실행 완료 및 온라인 상태입니다!`);

  // 슬래시 커맨드 등록
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`,
    );
    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    );
  } catch (error) {
    console.error("⚠️ 슬래시 커맨드 등록 중 오류 발생:", error);
  }
});

// 슬래시 커맨드 실행 이벤트 핸들링
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("명령어 실행 중 오류 발생:", error);
    try {
      const replyPayload = {
        content: "❌ 명령어를 실행하는 중 오류가 발생했습니다!",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyPayload);
      } else {
        await interaction.reply(replyPayload);
      }
    } catch (replyError) {
      console.error("에러 메시지 전송 실패 (상호작용이 만료되었거나 이미 응답됨):", replyError);
    }
  }
});

// 일반 메시지 이벤트 핸들링 (사용자 요청: "/안녕?" 메시지에 반응)
client.on(Events.MessageCreate, async (message) => {
  // 봇 메시지는 무시
  if (message.author.bot) return;

  // "/안녕?" 메시지인 경우 응답
  if (message.content.trim() === "/안녕?") {
    try {
      await message.reply(`안녕하세요 ${message.author}님!`);
    } catch (error) {
      console.error("메시지 응답 실패:", error);
    }
  }
});

if (token) {
  client.login(token).catch((err) => {
    console.error(
      "❌ 디스코드 로그인 실패: 토큰이 올바른지 확인해주세요.",
      err,
    );
  });
} else {
  console.error("❌ 디스코드 토큰이 설정되지 않아 로그인을 건너뜁니다.");
}
