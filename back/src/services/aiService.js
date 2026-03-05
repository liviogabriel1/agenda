const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeTasks(tasks) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `Você é um assistente de produtividade. Analise estas tarefas e retorne APENAS um JSON array com:
- "id": ID original
- "aiPriority": "Alta", "Média" ou "Baixa"
- "aiSuggestion": dica curta (máx 15 palavras)

Sem markdown, sem explicações. Apenas o JSON puro.
Tarefas: ${JSON.stringify(tasks)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
}

async function chatWithAI(userMessage, tasks, history = []) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const historyText = history.map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.text}`).join('\n');
    const prompt = `Você é o assistente pessoal de produtividade da "Agenda Inteligente".
Tarefas atuais do usuário: ${JSON.stringify(tasks)}

${historyText ? `Histórico da conversa:\n${historyText}\n` : ''}
Usuário: "${userMessage}"

Responda de forma amigável, direta e curta (máx 3 parágrafos).
Se pedir para criar uma tarefa, diga que pode fazer isso com o comando /criar seguido da descrição.
Use as tarefas para dar conselhos personalizados.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function parseTaskFromMessage(message) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const today = new Date().toISOString().split('T')[0];
    const prompt = `Extraia os dados desta mensagem para criar uma tarefa. Retorne APENAS JSON puro:
{
  "title": "título da tarefa",
  "description": "descrição opcional ou null",
  "dueDate": "YYYY-MM-DDT23:59:00"
}

Se não houver data mencionada, use hoje: ${today}T23:59:00
Mensagem: "${message}"`;
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

async function generateCompletionReport(task) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const dueDate = new Date(task.dueDate);
    const completedAt = new Date(task.completedAt);
    const diffMs = completedAt - dueDate;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const wasLate = diffMs > 0;
    const subtasksDone = task.subtasks?.filter(s => s.completedAt).length || 0;
    const subtasksTotal = task.subtasks?.length || 0;

    const prompt = `Você é um coach de produtividade. Analise a conclusão desta tarefa e retorne APENAS um JSON puro:
{
  "score": número de 0 a 100 representando qualidade da entrega,
  "difficulty": "Fácil" | "Moderada" | "Difícil" | "Muito Difícil",
  "timeAssessment": frase curta sobre o prazo (foi no prazo, atrasou X horas, entregou X horas antes),
  "feedback": frase motivacional e personalizada de 1-2 linhas baseada nos dados,
  "badge": um emoji que representa essa entrega (ex: 🏆 ⚡ 🎯 ✨ 🔥 💪 ⏰)
}

Dados da tarefa:
- Título: "${task.title}"
- Descrição: "${task.description || 'Nenhuma'}"
- Prazo: ${dueDate.toLocaleString('pt-BR')}
- Concluída em: ${completedAt.toLocaleString('pt-BR')}
- ${wasLate ? `Atrasou ${Math.abs(diffHours)}h` : `Entregue ${Math.abs(diffHours)}h antes`}
- Subtarefas: ${subtasksDone}/${subtasksTotal} concluídas
- Observações: "${task.notes || 'Nenhuma'}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
}

module.exports = { analyzeTasks, chatWithAI, parseTaskFromMessage, generateCompletionReport };