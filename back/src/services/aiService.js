const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeTasks(tasks) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
      Você é um assistente de produtividade especialista em gestão de tempo.
      Vou te enviar uma lista de tarefas no formato JSON.
      
      Sua missão é devolver um NOVO JSON (exatamente no formato de um array de objetos) contendo:
      - "id": O mesmo ID da tarefa original.
      - "aiPriority": Classifique como "Alta", "Média" ou "Baixa" baseado na urgência lógica.
      - "aiSuggestion": Uma dica curta (máximo 15 palavras) de como resolver essa tarefa de forma mais eficiente ou o que focar primeiro.

      Retorne APENAS o JSON puro, sem formatação markdown (como \`\`\`json).
      
      Aqui estão as tarefas:
      ${JSON.stringify(tasks)}
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const aiAnalysis = JSON.parse(responseText);

        return aiAnalysis;

    } catch (error) {
        console.error("Erro no aiService:", error);
        throw new Error("Falha ao analisar tarefas com a IA.");
    }
}

async function chatWithAI(userMessage, tasks) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
        Você é o assistente pessoal de produtividade da "Agenda Inteligente".
        O usuário tem as seguintes tarefas salvas no banco de dados atualmente:
        ${JSON.stringify(tasks)}

        O usuário perguntou: "${userMessage}"

        Responda de forma amigável, direta e curta (máximo de 3 parágrafos). 
        Se a pergunta for sobre organização, use a lista de tarefas dele para dar conselhos reais e personalizados de qual fazer primeiro ou como se organizar.
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Erro no chatWithAI:", error);
        throw new Error("Falha ao conversar com a IA.");
    }
}

module.exports = { analyzeTasks, chatWithAI };