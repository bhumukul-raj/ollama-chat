import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  IThemeManager
} from '@jupyterlab/apputils';

import { ChatWidget } from './components/ChatWidget';
import { getAvailableModels } from './services/ollama';
import React from 'react';
import ReactDOM from 'react-dom';
import { Widget } from '@lumino/widgets';

/**
 * A React component for displaying Ollama information
 */
const OllamaTestComponent: React.FC = () => {
  const [models, setModels] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await getAvailableModels();
        setModels(models);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch models:', error);
        setError('Failed to fetch models');
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (loading) {
    return <div>Loading Ollama models...</div>;
  }

  if (error) {
    return <div className="jp-error">Error: {error}</div>;
  }

  return (
    <div className="jp-OllamaTest">
      <h2>Ollama Models</h2>
      {models.length === 0 ? (
        <p>No models found. Make sure Ollama is running and has models installed.</p>
      ) : (
        <ul>
          {models.map((model: any, index: number) => (
            <li key={index}>{model.name}</li>
          ))}
        </ul>
      )}
      <p>
        <i>This is a minimal test of the Ollama API integration. Check the console for more details.</i>
      </p>
    </div>
  );
};

/**
 * Create a content widget for the OllamaTest component
 */
const createOllamaTestWidget = (): Widget => {
  const widget = new Widget();
  widget.addClass('jp-OllamaTestWidget');
  
  ReactDOM.render(<OllamaTestComponent />, widget.node);
  
  return widget;
};

/**
 * Initialization data for the jupyterlab-ai-assistant extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-ai-assistant:plugin',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [IThemeManager],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette, themeManager?: IThemeManager) => {
    console.log('JupyterLab AI Assistant extension is activated!');

    // Add command to show Ollama test widget
    const command = 'ai-assistant:show-ollama-test';
    app.commands.addCommand(command, {
      label: 'Show Ollama Connection Test',
      execute: () => {
        const content = createOllamaTestWidget();
        const widget = new MainAreaWidget({ content });
        widget.title.label = 'Ollama Test';
        app.shell.add(widget, 'main');
        app.shell.activateById(widget.id);
      }
    });

    // Add command to show Chat widget
    const chatCommand = 'ai-assistant:show-chat';
    app.commands.addCommand(chatCommand, {
      label: 'Open AI Assistant Chat',
      execute: () => {
        const widget = new ChatWidget({ themeManager });
        app.shell.add(widget, 'right', { rank: 1000 });
        app.shell.activateById(widget.id);
      }
    });

    // Add the commands to the command palette
    palette.addItem({ command, category: 'AI Assistant' });
    palette.addItem({ command: chatCommand, category: 'AI Assistant' });
  }
};

export default extension; 