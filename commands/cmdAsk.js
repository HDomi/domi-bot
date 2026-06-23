const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("질문")
    .setDescription("Domi's Server의 Gemma2 AI에게 질문합니다.")
    .addStringOption((option) =>
      option
        .setName("내용")
        .setDescription("AI에게 물어볼 질문 내용을 입력하세요.")
        .setRequired(true),
    ),

  async execute(interaction) {
    // 1. 디스코드 3초 타임아웃 방지를 위해 우선 대기 상태 진입
    await interaction.deferReply();

    const prompt = interaction.options.getString("내용");

    // 🌟 2. n8n Webhook 주소 설정
    const aiApiUrl = process.env.AI_API_URL;
    if (!aiApiUrl) {
      await interaction.editReply(
        "❌ 에러: `.env` 파일에 `AI_API_URL` 주소가 구성되지 않았습니다.",
      );
      return;
    }

    const n8nWebhookUrl = aiApiUrl.endsWith("/")
      ? `${aiApiUrl}webhook/domi-bot-ask`
      : `${aiApiUrl}/webhook/domi-bot-ask`;

    console.log(n8nWebhookUrl);
    try {
      // Node.js 내장 fetch를 사용하여 n8n에 POST로 질문 토스
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt }),
      });

      console.log("res", response);
      if (!response.ok) {
        throw new Error(`n8n 서버 응답 에러 (Status: ${response.status})`);
      }
      const responseText = await response.text();
      console.log("Raw Response From n8n:", responseText);

      if (!responseText || responseText.trim() === "") {
        throw new Error("n8n 서버가 빈 응답(0 바이트)을 반환했습니다.");
      }

      let aiResponse = responseText;

      // 만약 n8n이 여전히 JSON 형식으로 보냈을 경우를 대비한 방어 코드
      try {
        const jsonResult = JSON.parse(responseText);
        aiResponse = jsonResult.response || jsonResult.text || responseText;
      } catch (e) {
        // JSON 파싱에 실패하면 그냥 텍스트 날것을 답변으로 사용함
        aiResponse = responseText;
      }
      // 3. 디스코드 글자 수 제한(2000자) 안전장치 및 최종 출력
      if (aiResponse.length > 2000) {
        await interaction.editReply(
          aiResponse.substring(0, 1990) + "... (글자수 초과)",
        );
      } else {
        await interaction.editReply(`🤖 **AI의 답변:**\n\n${aiResponse}`);
      }
    } catch (error) {
      console.error("n8n 연동 실패:", error);
      try {
        await interaction.editReply(
          "❌ n8n 자동화 서버 연동 중 에러가 발생했습니다.",
        );
      } catch (replyError) {
        console.error(
          "에러 메시지 전송 실패 (상호작용이 만료되었거나 이미 응답됨):",
          replyError,
        );
      }
    }
  },
};
