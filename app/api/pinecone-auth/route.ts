import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openAi = new OpenAI({
    apiKey: process.env.PINECONE_API_KEY
})


const index = pc.index("igcomments");

export async function POST(request: Request) {
    try{
        const {locationId, text} = await request.json()

        if(!locationId || !text){
            return new Response("Missing locationId or text", { status: 400 });
        }

        const embeddingResponse = await openAi.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        })

        const embedding = embeddingResponse.data[0].embedding

        const namespace = locationId

        return new Response("Success", { status: 200 });


    }catch (error){
        console.error(error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
