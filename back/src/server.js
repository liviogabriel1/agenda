const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const { analyzeTasks, chatWithAI } = require('./services/aiService');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// teste
app.get('/ping', (req, res) => {
    res.json({ message: 'API da Agenda Inteligente online! 🚀' });
});

// Listar todas as tarefas
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await prisma.task.findMany({
            orderBy: { dueDate: 'asc' }
        });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
});

// Criar uma nova tarefa
app.post('/tasks', async (req, res) => {
    try {
        const { title, description, dueDate } = req.body;

        const newTask = await prisma.task.create({
            data: {
                title,
                description,
                dueDate: new Date(dueDate)
            }
        });

        res.status(201).json(newTask);
    } catch (error) {
        console.error("Erro no POST /tasks:", error);
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
});

// Marcar tarefa como concluída e adicionar observações
app.patch('/tasks/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { completedAt, notes } = req.body;
        const updatedTask = await prisma.task.update({
            where: { id: id },
            data: {
                completedAt: completedAt ? new Date(completedAt) : new Date(),
                notes: notes || null
            }
        });

        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao concluir a tarefa' });
    }
});

// Analisar tarefas sem prioridade com a IA
app.post('/tasks/analyze', async (req, res) => {
    try {
        const pendingTasks = await prisma.task.findMany({
            where: { aiPriority: null },
            select: { id: true, title: true, description: true, dueDate: true }
        });

        if (pendingTasks.length === 0) {
            return res.json({ message: "Nenhuma tarefa precisando de análise no momento!" });
        }

        const aiResults = await analyzeTasks(pendingTasks);
        const updatePromises = aiResults.map(result =>
            prisma.task.update({
                where: { id: result.id },
                data: {
                    aiPriority: result.aiPriority,
                    aiSuggestion: result.aiSuggestion
                }
            })
        );

        await Promise.all(updatePromises);

        res.json({ message: "Tarefas analisadas com sucesso pela IA!", updatedCount: aiResults.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar análise com IA' });
    }
});

app.post('/ai/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Mensagem vazia." });

        const tasks = await prisma.task.findMany({ orderBy: { dueDate: 'asc' } });

        const aiResponse = await chatWithAI(message, tasks);

        res.json({ response: aiResponse });
    } catch (error) {
        console.error("Erro no POST /ai/chat:", error);
        res.status(500).json({ error: 'Erro ao conversar com a IA' });
    }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
});