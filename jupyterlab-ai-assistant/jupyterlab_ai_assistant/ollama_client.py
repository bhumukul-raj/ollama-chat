import json
import requests
from typing import Dict, List, Optional, Any, Generator

class OllamaClient:
    """Client for interacting with the Ollama API."""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        """Initialize the Ollama client.
        
        Args:
            base_url: Base URL for the Ollama API. Default is http://localhost:11434.
        """
        self.base_url = base_url.rstrip('/')
        
    def list_models(self) -> List[Dict[str, Any]]:
        """List all available models.
        
        Returns:
            List of model information dictionaries.
        """
        url = f"{self.base_url}/api/tags"
        response = requests.get(url)
        response.raise_for_status()
        return response.json().get('models', [])
    
    def chat_completion(
        self, 
        model: str,
        messages: List[Dict[str, str]],
        stream: bool = True,
        temperature: float = 0.7,
        context: Optional[List[int]] = None,
        **kwargs
    ) -> Generator[Dict[str, Any], None, None] or Dict[str, Any]:
        """Generate a chat completion using the specified model.
        
        Args:
            model: The name of the model to use.
            messages: A list of messages in the conversation history.
            stream: Whether to stream the response. Default is True.
            temperature: Controls randomness of the output. Default is 0.7.
            context: Optional list of integers for context window.
            **kwargs: Additional parameters to pass to the API.
            
        Returns:
            If stream is True, returns a generator yielding response chunks.
            If stream is False, returns the complete response.
        """
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "temperature": temperature,
            **kwargs
        }
        
        if context is not None:
            payload["context"] = context
            
        if stream:
            response = requests.post(url, json=payload, stream=True)
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    chunk = json.loads(line)
                    yield chunk
                    
                    # Check if this is the last chunk
                    if chunk.get("done", False):
                        break
        else:
            # For non-streaming responses, don't use streaming mode
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
    
    def generate_embeddings(self, model: str, text: str) -> List[float]:
        """Generate embeddings for the given text using the specified model.
        
        Args:
            model: The name of the model to use.
            text: The text to generate embeddings for.
            
        Returns:
            A list of floats representing the embedding vector.
        """
        url = f"{self.base_url}/api/embeddings"
        
        payload = {
            "model": model,
            "prompt": text
        }
        
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json().get('embedding', []) 