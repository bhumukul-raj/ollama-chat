from traitlets import Bool, Dict, Integer, List, Unicode
from traitlets.config import Configurable

class OllamaConfig(Configurable):
    """Configuration for the Ollama integration."""
    
    base_url = Unicode(
        "http://localhost:11434",
        help="Base URL for the Ollama API.",
        config=True
    )
    
    enabled = Bool(
        True,
        help="Enable or disable the Ollama integration.",
        config=True
    )
    
    default_model = Unicode(
        "llama2",
        help="Default model to use for Ollama requests.",
        config=True
    )
    
    allowed_models = List(
        Unicode(),
        default_value=None,
        help="""
        Ollama models to allow, as a list of model IDs.
        If None, all models are allowed.
        """,
        allow_none=True,
        config=True
    )
    
    max_tokens = Integer(
        4096,
        help="Maximum number of tokens to generate.",
        config=True
    )
    
    default_temperature = Unicode(
        "0.7",
        help="Default temperature for generation.",
        config=True
    )
    
    request_timeout = Integer(
        60,
        help="Timeout for Ollama API requests in seconds.",
        config=True
    )
    
    model_options = Dict(
        {},
        help="""
        Additional options for specific models.
        For example: {"llama2": {"temperature": 0.8}}
        """,
        config=True
    ) 