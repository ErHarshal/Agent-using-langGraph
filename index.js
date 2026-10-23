import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { ChatOllama } from '@langchain/ollama';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});

const llm = new ChatOllama({
     model: "llama3.2:3b",
    baseUrl: "http://localhost:11434"
})


async function callModel(state){
    console.log('calling a llm..');
    const res = await llm.invoke(state.messages)
    return {messages: [res]};
}

const graph = new StateGraph(MessagesAnnotation)
.addNode('agent', callModel)
.addEdge('__start__', 'agent')
.addEdge('agent', '__end__');

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