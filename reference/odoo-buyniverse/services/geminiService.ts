


import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobBudget, ProjectLevel, Duration, ExperienceLevel, InvoiceLineItem } from '@/types';
import { ColumnDef } from "@/components/ui/DataTable";

// We can't use the hook here, so we'll do a simplified version for service-level errors
import es from '@/i18n/es';
import en from '@/i18n/en';

const getErrorMessage = (key: string): string => {
    const lang = localStorage.getItem('app-lang') || 'es';
    const strings = lang === 'en' ? en : es;
    // Basic lookup, doesn't handle nested keys like the real hook
    return (strings.errors as any)[key] || en.errors.default;
};


if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

type GeneratedJob = Pick<Job, 'title' | 'description' | 'skills' | 'experienceLevel' | 'projectLevel' | 'duration' | 'category' | 'hiringLimitDate' | 'dueDate' | 'visibility'> & { budget: JobBudget };

// Define WidgetConfig type locally for the service
export interface AIWidgetPlan {
    title: string;
    type: 'bar' | 'pie' | 'summary';
    dataKey: 'leads' | 'invoices' | 'payments' | 'expenses';
    xAxisColumn?: string;
    yAxisColumn?: string;
    aggregation?: 'count' | 'sum' | 'average';
    size: number;
    minSize: number;
    maxSize: number;
    category: string;
    explanation: string;
}

export interface AICardLayoutConfig {
    title: string;
    subtitle?: string;
    body: string[];
    footer: string[];
}


export const getInvoiceLineItemSuggestions = async (description: string): Promise<Partial<Pick<InvoiceLineItem, 'productCode' | 'unitCode' | 'objetoImp'>>> => {
    if (!process.env.API_KEY) {
        throw new Error(getErrorMessage('apiKeyMissing'));
    }

    const itemSchema = {
        type: Type.OBJECT,
        properties: {
            productCode: { 
                type: Type.STRING, 
                description: "Suggest a valid 8-digit SAT 'ClaveProdServ' code based on the item description. Example: 84111500 for 'Servicios de desarrollo de tecnología de la información'." 
            },
            unitCode: { 
                type: Type.STRING, 
                description: "Suggest a valid SAT 'ClaveUnidad' code. Common values are 'E48' for 'Unidad de servicio' or 'H87' for 'Pieza'." 
            },
            objetoImp: { 
                type: Type.STRING, 
                enum: ['01', '02', '03'], 
                description: "Suggest a 'ObjetoImp' code. Use '02' (Sí objeto de impuesto) for most services and products. Use '01' if it's explicitly not taxed." 
            }
        },
        required: ['productCode', 'unitCode', 'objetoImp']
    };

    const fullPrompt = `You are a Mexican tax law expert specializing in CFDI 4.0. Analyze the following invoice line item description and provide the most appropriate SAT codes in a JSON object.
    
    Description: "${description}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: itemSchema,
            },
        });
        
        // FIX: Access response text directly via the .text property.
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as Partial<Pick<InvoiceLineItem, 'productCode' | 'unitCode' | 'objetoImp'>>;
    } catch (error) {
        console.error("Error generating invoice item suggestions with AI:", error);
        throw new Error(getErrorMessage('aiFail'));
    }
};


export const generateCardLayoutConfig = async ({
    columns,
    currentConfig,
    userPrompt
}: {
    columns: Pick<ColumnDef<any>, 'accessorKey' | 'header'>[];
    currentConfig?: AICardLayoutConfig | null;
    userPrompt?: string;
}): Promise<AICardLayoutConfig> => {
     if (!process.env.API_KEY) {
        throw new Error(getErrorMessage('apiKeyMissing'));
    }

    const cardLayoutSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The single column key for the main card title. Should be the most important identifier, like 'title' or 'name'." },
            subtitle: { type: Type.STRING, description: "An optional column key for a subtitle, like a category, client name, or a unique ID." },
            body: {
                type: Type.ARRAY,
                description: "An array of 2 to 4 column keys for the main content. Good for dates and details.",
                items: { type: Type.STRING }
            },
            footer: {
                type: Type.ARRAY,
                description: "An array of 1 or 2 column keys for the footer. Ideal for status, progress, tags, or a total amount.",
                items: { type: Type.STRING }
            }
        },
        required: ['title', 'body', 'footer']
    };

    const columnsString = columns
        .filter(c => c.accessorKey !== 'action' && c.accessorKey !== 'id')
        .map(c => `(key: "${String(c.accessorKey)}", name: "${c.header instanceof Function ? String(c.header) : c.header}")`).join(', ');

    let fullPrompt = `
        You are a UI/UX design expert specializing in data visualization. 
        Your task is to design an optimal layout for a data card based on the provided column definitions.
        The layout consists of four sections: 'title', 'subtitle', 'body', and 'footer'. Your response must be a JSON object matching the schema.

        Here are some guidelines for choosing columns:
        - 'title': The single, most important identifier. Look for keys like 'title', 'name', or 'description'. For projects, this would be the project title.
        - 'subtitle': Secondary identifying information. Good options are client names, categories, or a unique ID.
        - 'body': Key details and data points. Dates, amounts, and specific attributes work well here. Choose 2 to 4 of the most relevant fields that are not in other sections.
        - 'footer': Summary information. Look for 'status', 'progress', or 'tags'. These are perfect for the footer.
        
        Example for a 'Project' data type:
        - If columns are (id, title, clientName, startDate, dueDate, progress, status, tags), a good layout would be:
          - title: "title"
          - subtitle: "id"
          - body: ["startDate", "dueDate"]
          - footer: ["progress", "status"]

        Available Columns (key and display name):
        ${columnsString}
    `;

    if (currentConfig && userPrompt) {
        fullPrompt += `
            
            The current layout is: ${JSON.stringify(currentConfig)}.
            The user wants to make a change. User request: "${userPrompt}".
            Modify the current layout based on the user's request. For example, if the user says "move value to the footer", you should remove 'value' from the body and add it to the footer array.
            Return the complete, modified JSON layout object.
        `;
    } else {
        fullPrompt += `
            
            Based on the available columns, create the initial optimal card layout.
            Return a JSON object that strictly follows the provided schema.
        `;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: cardLayoutSchema,
            },
        });
        
        // FIX: Access response text directly via the .text property.
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as AICardLayoutConfig;
    } catch (error) {
        console.error("Error generating card layout with AI:", error);
        throw new Error(getErrorMessage('aiFail'));
    }
};


export const generateWidgetPlan = async (
    prompt: string,
    datasets: { key: string, columns: Pick<ColumnDef<any>, 'accessorKey' | 'header'>[] }[],
    existingCategories: string[],
    conversationHistory: { user: string; ai: string }[]
): Promise<AIWidgetPlan> => {
     if (!process.env.API_KEY) {
        throw new Error(getErrorMessage('apiKeyMissing'));
    }
    
    const widgetPlanSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'A concise, descriptive title for the widget based on the user request.' },
            type: { type: Type.STRING, enum: ['bar', 'pie', 'summary'], description: 'The type of chart.' },
            dataKey: { type: Type.STRING, enum: ['leads', 'invoices', 'payments', 'expenses'], description: 'The dataset to use for the widget.'},
            xAxisColumn: { type: Type.STRING, description: 'The data key for the X-axis (categories). Must be a valid column key from the selected dataKey.' },
            yAxisColumn: { type: Type.STRING, description: 'The data key for the Y-axis (values). Required for bar and summary charts. Must be a valid numeric column key.' },
            aggregation: { type: Type.STRING, enum: ['count', 'sum', 'average'], description: 'The aggregation method.' },
            size: { type: Type.NUMBER, description: 'Suggested column span for the widget, from 1 to 4.' },
            minSize: { type: Type.NUMBER, description: 'Suggested minimum column span for the widget, from 1 to 4.' },
            maxSize: { type: Type.NUMBER, description: 'Suggested maximum column span for the widget, from 1 to 4.' },
            category: { type: Type.STRING, description: 'A short, relevant category for this widget (e.g., "Sales", "Leads"). Try to use an existing category if it fits.' },
            explanation: { type: Type.STRING, description: 'A friendly, natural language explanation of the plan for the user.' }
        },
        required: ['title', 'type', 'dataKey', 'explanation', 'size', 'minSize', 'maxSize', 'category']
    };

    const datasetsString = datasets.map(d => `Dataset "${d.key}":\nColumns: ${d.columns.map(c => `(key: "${String(c.accessorKey)}", name: "${c.header instanceof Function ? String(c.header) : c.header}")`).join(', ')}`).join('\n\n');

    const fullPrompt = `
        You are an expert AI dashboard assistant. A user wants to create or modify a widget.
        Analyze the user's request, the available data, and the conversation history.
        Then, create a JSON plan for the widget and a natural language explanation of what you are proposing.

        Conversation History (User and your previous responses):
        ${conversationHistory.map(turn => `User: ${turn.user}\nAI: ${turn.ai}`).join('\n')}

        Latest User Request: "${prompt}"

        Available Datasets and Columns:
        ${datasetsString}

        Existing Dashboard Categories:
        ${existingCategories.join(', ')}

        Rules:
        - Choose the most appropriate 'dataKey' based on the user's prompt.
        - For 'pie' charts, use 'xAxisColumn' for segments and the aggregation must be 'count'. Do not use 'yAxisColumn'.
        - For 'bar' charts, 'xAxisColumn' is for categories. If aggregation is 'sum' or 'average', 'yAxisColumn' is required.
        - For 'summary' charts, 'yAxisColumn' and 'aggregation' are required. 'xAxisColumn' is not used.
        - Suggest a 'size' (column span) between 1 and 4. A summary is usually 1. A detailed bar chart might be 2 or 3.
        - Suggest 'minSize' and 'maxSize' for resizing. A summary widget should have min/max of 1.
        - For 'category', choose an existing category if it's a good fit, otherwise suggest a new, logical one.
        - The 'explanation' should be a friendly, natural language message to the user confirming you understood and explaining the plan. For example: "Sure! I can create a bar chart to show the total value by status. It will be 2 columns wide and I'll place it in the 'Sales Performance' category. Does that sound right?"

        Generate a JSON object that strictly follows the provided schema.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: widgetPlanSchema,
            },
        });
        
        // FIX: Access response text directly via the .text property.
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as AIWidgetPlan;

    } catch (error) {
        console.error("Error generating widget plan with AI:", error);
        throw new Error(getErrorMessage('aiFail'));
    }
}


export const generateJobDetailsWithAI = async (prompt: string): Promise<Partial<GeneratedJob>> => {
    if (!process.env.API_KEY) {
        throw new Error(getErrorMessage('apiKeyMissing'));
    }

    const jobSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "A concise, professional job title." },
            description: { type: Type.STRING, description: "A detailed job description (at least 150 words), formatted with paragraphs and bullet points." },
            skills: { type: Type.ARRAY, description: "An array of 5-7 relevant string skills.", items: { type: Type.STRING } },
            category: { type: Type.STRING, description: "A single, relevant project category (e.g., 'Web Development', 'Logo Design')." },
            budget: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ['Fixed-Price', 'Hourly'] },
                    amount: { type: Type.NUMBER, description: "The suggested budget amount." }
                },
                required: ['type', 'amount']
            },
            experienceLevel: { type: Type.STRING, enum: Object.values(ExperienceLevel) },
            projectLevel: { type: Type.STRING, enum: Object.values(ProjectLevel), description: "The complexity level of the project." },
            duration: { type: Type.STRING, enum: Object.values(Duration), description: "The estimated duration of the project." },
            hiringLimitDate: { type: Type.STRING, description: "A suggested hiring deadline in YYYY-MM-DD format, set for a reasonable time in the future (e.g., 2 weeks from now)." },
            dueDate: { type: Type.STRING, description: "A suggested final project deadline in YYYY-MM-DD format, based on the duration." },
            visibility: { type: Type.STRING, enum: ['public', 'private'], description: "The visibility of the project." },
        },
        required: ['title', 'description', 'skills', 'category', 'budget', 'experienceLevel', 'projectLevel', 'duration', 'hiringLimitDate', 'dueDate', 'visibility']
    };

    const fullPrompt = `
        You are an expert project manager. Based on the following job idea, generate a complete and professional job posting.
        - The current date is ${new Date().toLocaleDateString()}.
        - Set a realistic 'hiringLimitDate' (e.g., 2 weeks from now) and a 'dueDate' based on the estimated 'duration'.
        - Set the project 'visibility' to 'private' by default.
        - Ensure all fields in the schema are filled out logically and professionally.
        
        Job Idea: "${prompt}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: jobSchema,
            },
        });
        
        // FIX: Access response text directly via the .text property.
        const jsonStr = response.text.trim();
        const parsedData = JSON.parse(jsonStr) as Partial<GeneratedJob>;
        
        if (!parsedData.title || !parsedData.description || !parsedData.skills) {
            throw new Error(getErrorMessage('aiFormat'));
        }
        
        return parsedData;

    } catch (error) {
        console.error("Error generating job details with AI:", error);
        throw new Error(getErrorMessage('aiFail'));
    }
};

export const refineJobDescriptionWithAI = async (
    originalDescription: string,
    prompt: string,
    selection?: string
): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error(getErrorMessage('apiKeyMissing'));
    }

    let fullPrompt: string;

    if (selection && selection.trim().length > 0) {
        fullPrompt = `
You are an expert copy editor. A user has selected a portion of a job description and wants you to refine it.
Your task is to rewrite ONLY the selected text based on the user's prompt and then return the FULL, original description with ONLY the selected part replaced.

Original Description:
---
${originalDescription}
---

Selected Text to Refine:
---
${selection}
---

User's Prompt: "${prompt}"

Instructions:
1. Rewrite the "Selected Text to Refine" according to the prompt.
2. Integrate the rewritten text back into the "Original Description", replacing the original selection perfectly.
3. Return only the complete, modified description as a single block of text. Do not add any extra explanations or formatting.
        `;
    } else {
        fullPrompt = `
You are an expert copywriter. A user wants you to rewrite an entire job description based on their prompt.

Original Description:
---
${originalDescription}
---

User's Prompt: "${prompt}"

Instructions:
1. Rewrite the entire "Original Description" according to the user's prompt.
2. Return only the complete, rewritten description as a single block of text. Do not add any extra explanations or formatting.
        `;
    }
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
        });

        // FIX: Access response text directly via the .text property.
        return response.text.trim();
    } catch (error) {
        console.error("Error refining job description with AI:", error);
        throw new Error(getErrorMessage('aiFail'));
    }
};

export const generateAgencyBioWithAI = async (prompt: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error(getErrorMessage('apiKeyMissing'));
    }

    const fullPrompt = `Based on the following prompt, write a compelling and professional agency biography of about 100-150 words. The tone should be confident and expert. Prompt: "${prompt}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
        });

        // FIX: Access response text directly via the .text property.
        return response.text;
    } catch (error) {
        console.error("Error generating agency bio with AI:", error);
        throw new Error(getErrorMessage('aiBioFail'));
    }
}
