import "dotenv/config";
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOllama } from '@langchain/ollama';
import { TavilySearch } from '@langchain/tavily';
import { createInterface } from 'node:readline/promises';

const tavilySearch = new TavilySearch({
    maxResults: 3,
    topic: "general",
    includeAnswer: false,
    includeRawContent: false,
    includeImages: false,
    searchDepth: "basic",
    timeRange: "day",
    startDate: null,
    endDate: null,
    includeDomains: [],
    excludeDomains: [],
    includeUsage: false
})

const tools = [tavilySearch]
const toolNode = new ToolNode(tools)


const rl = createInterface({
    input: process.stdin,
    output: process.stdout
});

const llm = new ChatOllama({
     model: "llama3.2:3b",
    baseUrl: "http://localhost:11434"
}).bindTools(tools);

async function callModel(state){
    console.log('calling a llm..');
    const res = await llm.invoke([{
    role: "system",
    content:
      "Answer greetings and normal conversation directly. Use tavily_search only for questions requiring current facts, news, or weather. Do not call tools for greetings.",
  },
  ...state.messages]);
    return {messages: [res]};
}

const shouldRunTools = (state) => {
    const lastMessage = state.messages[state.messages.length -1];
    console.log('lastMessage', lastMessage.tool_calls);
    if(lastMessage.tool_calls.length > 0) {
        return 'tools';
    }
    return '__end__';
}

const graph = new StateGraph(MessagesAnnotation)
.addNode('agent', callModel)
.addNode('tools', toolNode)
.addEdge('__start__', 'agent')
.addEdge('tools', 'agent')
.addConditionalEdges('agent', shouldRunTools)

const app = graph.compile();


async function main() {
    while(true){
        const input = await rl.question('You: ');
        if(input === '/bye') break;
        
        const final  = await app.invoke({
            messages: [{'role': 'user', content: input}]
        });


        const lastMessage = final.messages[final.messages.length -1].content
        console.log('AI: ',lastMessage);
    }    
    rl.close();
}
main();