import asyncio
import websockets
import time
import requests
import json

def getAiOpinion(message,tokens):
    # I created a new openAI account to get this api key, it should last for a few months , I sent you the api key in the last email
    api_key = 'API_KEY_HERE'
    # this is a variable that counts the number of times the api is called, if the api is called 5 times and it still fails, it will return a message that the virtual teacher is not available
    # the openai api is not very reliable, it sometimes fails to return a response, so I added this to make sure that the api is called at least 5 times before returning the message
    counter = 0
    while True:
        try:
            headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
            }
            json_data = {
                # custom configuration for the api
                # it is the best one for this use case
                'model': 'text-davinci-003',
                'prompt': message,
                'temperature': 0.7,
                'max_tokens': tokens,
                'top_p': 1,
                'frequency_penalty': 0.6,
                'presence_penalty': 0,
                "stop": [" Human:", " AI:"]
            }
            # I could have used the openai package from pypi , but I prefer making raw requests myself
            response = requests.post('https://api.openai.com/v1/completions', headers=headers, json=json_data)
            jned = response.json()
            print(jned)
            try:
                # this is the error message that the api returns if it is overloaded , if the api key is invalid , or if a reached the limit of the number of requests per minute
                if jned['error'] and counter == 5:
                    return (['The virtual teacher is not available'])
            except Exception as e:
                print(e)
                pass
            try:
                total_tokens = int(jned['usage']['total_tokens'])
                finish = str(jned['choices'][0]['finish_reason'])
                content = str(jned['choices'][0]['text'])
                return ([content,finish,int(total_tokens)])
            except Exception as e:
                print(e)
                pass
        except Exception as e:
            # we will never reach this part of the code, but I added it just in case
            # this part of the code will be executed if the api is down (last week it was down for 5 hours)
            content = 'The virtual teacher is feeling sleepy, please try again later'
            time.sleep(5)
            if counter == 5:
                return ([content,finish,0])
        counter += 1
    
async def main(websocket):
    # instead of making a complicated django server I decided to use simple websockets to communicate with the frontend
    # the websocket_messages variable is a dictionary that contains the messages of each websocket connection
    # the key is the websocket connection and the value is a list messages that have been exchanged between the virtual teacher and the student
    # the maximum number of message pairs stored per websocket connection is 10 ,so 20 messages in total
    websocket_messages = {}
    # we will be sending the last 4 messages to the openai api (to save tokens)
    # you can change this number if you wish , but it will cost more tokens
    limit_messages = 4
    while True:
        # Receive message from client
        client_message = await websocket.recv()
        
        # qna = list of messages between the virtual teacher and the student
        qna = websocket_messages.get(websocket)
        if not qna:
            qna = []
        # this is the list of messages that will be sent to the openai api (plus the current prompt)
        # I am getting the last 4 messages from the list of message pairs (2 message pairs)
        # so with the line of code below I am getting the last 2 message pairs and assigning them to the variable valid_pairs
        valid_pairs = qna[-limit_messages//2::]
        # old_json is a temporary variable that will be used to store the new list of messages
        old_json = qna
        # this is the preample of the prompt that will be sent to the openai api, feel free to tweak it
        prompt = "you are a virtual teacher and this conversation is between you and a student"
        human = client_message
        # tmp = 'gss'
        for i in valid_pairs:
            prompt += '\nHuman: '+i['question'] + '\nAI: '+i['answer']
            # tmp = i['question']
        # if tmp != human:
        prompt += '\nHuman: '+human + '\nAI: '
        # else:
        #     prompt += '\nHuman: '+human + '\nAI: '

        # with the line of code below , I am calling the getAiOpinion function , with  the limit of 500 tokens 
        ai_reply = getAiOpinion(prompt, 500)
        # let's strip the reply from the openai api
        ai_reply_content = ai_reply[0].strip()
        
        # let's append the new message pair to the list of message pairs
        old_json.append({
            "question": human,
            "answer": ai_reply_content,
            "asked": int(time.time())
        })
        # let's make sure that the list of message pairs does not exceed 10 message pairs
        # with the line of code below I am removing the older messages
        if len(old_json) > 10:
            old_json = old_json[-10:]
        websocket_messages[websocket] = old_json
        await websocket.send(ai_reply_content)

start_server = websockets.serve(main, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server) 
asyncio.get_event_loop().run_forever()