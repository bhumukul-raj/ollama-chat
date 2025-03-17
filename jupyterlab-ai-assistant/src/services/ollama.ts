import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the API extension
 *
 * @param endPoint API endpoint
 * @param init Request initialization options
 * @returns The response body parsed as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Get server connection settings
  const settings = ServerConnection.makeSettings();
  
  // Construct the URL
  const url = URLExt.join(
    settings.baseUrl,
    'api',
    'ollama',
    endPoint
  );
  
  // Make the request
  let response: Response;
  try {
    response = await ServerConnection.makeRequest(url, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }
  
  // Handle errors
  if (!response.ok) {
    const data = await response.json();
    throw new ServerConnection.ResponseError(response, data.error || `Request failed: ${response.statusText}`);
  }
  
  // Parse and return the data
  return await response.json() as T;
}

/**
 * Get all available Ollama models
 * 
 * @returns A list of available models
 */
export async function getAvailableModels(): Promise<any[]> {
  try {
    const data = await requestAPI<{ models: any[] }>('models');
    return data.models || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

/**
 * Send a chat message to Ollama
 * 
 * @param model The model to use
 * @param messages The chat messages
 * @param options Additional options
 * @returns The response from Ollama
 */
export async function sendChatMessage(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: Record<string, any> = {}
): Promise<any> {
  try {
    const data = await requestAPI<any>('chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...options
      })
    });
    
    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Analyze cell content using Ollama
 * 
 * @param model The model to use
 * @param cellContent The cell content to analyze
 * @param cellType The type of cell (code, markdown)
 * @param question The question to ask about the cell
 * @returns The analysis result
 */
export async function analyzeCellContent(
  model: string,
  cellContent: string,
  cellType: string,
  question: string
): Promise<any> {
  try {
    const data = await requestAPI<any>('cell-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        cell_content: cellContent,
        cell_type: cellType,
        question
      })
    });
    
    return data;
  } catch (error) {
    console.error('Error analyzing cell content:', error);
    throw error;
  }
} 