from ._version import __version__
from .handlers import setup_handlers
from .ollama_client import OllamaClient
from .config import OllamaConfig

def _jupyter_server_extension_paths():
    """Entry point for the server extension."""
    return [{
        "module": "jupyterlab_ai_assistant"
    }]

def _jupyter_labextension_paths():
    """Entry point for the lab extension."""
    return [{
        "name": "jupyterlab-ai-assistant",
        "src": "static",
        "dest": "jupyterlab-ai-assistant"
    }]

def _load_jupyter_server_extension(server_app):
    """Load the Jupyter server extension."""
    # Get configuration
    config = OllamaConfig(config=server_app.config)
    
    # Initialize Ollama client
    ollama_client = OllamaClient(base_url=config.base_url)
    
    # Set up the handlers
    setup_handlers(server_app.web_app, ollama_client)
    
    server_app.log.info(f"Registered JupyterLab AI Assistant Extension v{__version__}")
