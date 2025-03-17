import json
from typing import Dict, List, Any, Optional

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import requests

from .ollama_client import OllamaClient

class OllamaBaseHandler(APIHandler):
    """Base handler for Ollama API requests."""
    
    @property
    def ollama_client(self) -> OllamaClient:
        """Get the Ollama client from the application settings."""
        return self.settings["ollama_client"]

class OllamaModelsHandler(OllamaBaseHandler):
    """Handler for listing available Ollama models."""
    
    @tornado.web.authenticated
    async def get(self):
        """Handle GET requests to list available models."""
        try:
            models = self.ollama_client.list_models()
            self.finish(json.dumps({"models": models}))
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaChatHandler(OllamaBaseHandler):
    """Handler for Ollama chat completions."""
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for chat completions."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "")
            messages = body.get("messages", [])
            temperature = body.get("temperature", 0.7)
            stream = body.get("stream", True)
            
            # Log request parameters for debugging
            print(f"OllamaChatHandler.post: model={model}, stream={stream}, messages={messages[:2]}...")
            
            if not model:
                self.set_status(400)
                self.finish(json.dumps({"error": "Model not specified"}))
                return
                
            if not messages:
                self.set_status(400)
                self.finish(json.dumps({"error": "No messages provided"}))
                return
            
            # Set appropriate headers for streaming if needed
            if stream:
                self.set_header("Content-Type", "text/event-stream")
                self.set_header("Cache-Control", "no-cache")
                self.set_header("Connection", "keep-alive")
                
                # Stream the response
                for chunk in self.ollama_client.chat_completion(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    stream=True
                ):
                    self.write(f"data: {json.dumps(chunk)}\n\n")
                    await self.flush()
                    
                    if chunk.get("done", False):
                        break
                        
                self.finish()
            else:
                # For non-streaming mode, call the Ollama API directly to avoid generator issues
                print("OllamaChatHandler.post: Using non-streaming mode with direct API call")
                try:
                    url = f"{self.ollama_client.base_url}/api/chat"
                    payload = {
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "stream": False
                    }
                    
                    response = requests.post(url, json=payload)
                    response.raise_for_status()
                    result = response.json()
                    
                    print(f"OllamaChatHandler.post: Response type = {type(result)}, response = {str(result)[:100]}...")
                    self.finish(json.dumps(result))
                except Exception as inner_e:
                    print(f"OllamaChatHandler.post: Inner exception: {type(inner_e)} - {str(inner_e)}")
                    raise inner_e
                
        except Exception as e:
            print(f"OllamaChatHandler.post: Exception: {type(e)} - {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaEmbeddingsHandler(OllamaBaseHandler):
    """Handler for generating embeddings using Ollama."""
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for generating embeddings."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "")
            text = body.get("text", "")
            
            if not model:
                self.set_status(400)
                self.finish(json.dumps({"error": "Model not specified"}))
                return
                
            if not text:
                self.set_status(400)
                self.finish(json.dumps({"error": "No text provided"}))
                return
            
            # Generate embeddings
            embeddings = self.ollama_client.generate_embeddings(model=model, text=text)
            self.finish(json.dumps({"embeddings": embeddings}))
                
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaCellContextHandler(OllamaBaseHandler):
    """Handler for analyzing cell code using Ollama."""
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for analyzing cell code."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "")
            cell_content = body.get("cell_content", "")
            cell_type = body.get("cell_type", "code")
            question = body.get("question", "Explain this code")
            
            if not model:
                self.set_status(400)
                self.finish(json.dumps({"error": "Model not specified"}))
                return
                
            if not cell_content:
                self.set_status(400)
                self.finish(json.dumps({"error": "No cell content provided"}))
                return
            
            # Create appropriate prompt based on cell type and question
            if cell_type == "markdown":
                system_prompt = "You are an AI assistant helping with Jupyter notebooks. Analyze the following markdown content."
            else:
                system_prompt = "You are an AI assistant helping with Jupyter notebooks. Analyze the following code."
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{question}:\n\n{cell_content}"}
            ]
            
            # Get response from Ollama
            response = self.ollama_client.chat_completion(
                model=model,
                messages=messages,
                stream=False
            )
            
            self.finish(json.dumps(response))
                
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaTestHandler(OllamaBaseHandler):
    """Handler for testing direct Ollama API calls."""
    
    @tornado.web.authenticated
    async def get(self):
        """Handle GET requests for direct Ollama API testing."""
        try:
            model = self.get_argument("model", "llama3.1:8b")
            
            # Call the Ollama API directly
            url = f"{self.ollama_client.base_url}/api/tags"
            response = requests.get(url)
            response.raise_for_status()
            
            # Return the raw response
            self.finish(json.dumps({
                "direct_response": response.json(),
                "ollama_base_url": self.ollama_client.base_url
            }))
                
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for direct chat testing."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "llama3.1:8b")
            messages = body.get("messages", [{"role": "user", "content": "Hello, how are you?"}])
            
            # Call the Ollama API directly
            url = f"{self.ollama_client.base_url}/api/chat"
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            # Return the raw response
            self.finish(json.dumps({
                "direct_response": response.json(),
                "call_info": {
                    "url": url,
                    "payload": payload
                }
            }))
                
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

def setup_handlers(web_app, ollama_client):
    """Set up the handlers for the Ollama API."""
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    
    # Add the Ollama client to the application settings
    web_app.settings["ollama_client"] = ollama_client
    
    # Define the routes
    handlers = [
        (url_path_join(base_url, "api", "ollama", "models"), OllamaModelsHandler),
        (url_path_join(base_url, "api", "ollama", "chat"), OllamaChatHandler),
        (url_path_join(base_url, "api", "ollama", "embeddings"), OllamaEmbeddingsHandler),
        (url_path_join(base_url, "api", "ollama", "cell-context"), OllamaCellContextHandler),
        (url_path_join(base_url, "api", "ollama", "test"), OllamaTestHandler),
    ]
    
    # Add the handlers to the web app
    web_app.add_handlers(host_pattern, handlers) 