import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IToolbarWidgetRegistry, ICommandPalette } from '@jupyterlab/apputils';
import { ToolbarButton, ReactWidget, showDialog, Dialog } from '@jupyterlab/apputils';

import { MainAreaWidget, IThemeManager } from '@jupyterlab/apputils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { ICellModel, Cell, CodeCell } from '@jupyterlab/cells';

import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu } from '@lumino/widgets';
import { Widget } from '@lumino/widgets';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import { ChatWidget } from './components/ChatWidget';
import { getAvailableModels } from './services/ollama';
import { requestAPI } from './services/ollama';

// ReactComponent for the AI Analysis Modal
const AIAnalysisComponent: React.FC<{
  cellContent: string;
  cellType: string;
  question?: string;
}> = ({ cellContent, cellType, question = 'Explain this code' }) => {
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [model, setModel] = useState<string>('llama3.1:8b'); // Default model
  const [models, setModels] = useState<any[]>([]);

  // Fetch models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const result = await getAvailableModels();
        setModels(result || []);
        if (result && result.length > 0) {
          setModel(result[0].name);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
      }
    };
    fetchModels();
  }, []);

  // Function to analyze cell content
  useEffect(() => {
    const analyzeCell = async () => {
      try {
        setLoading(true);
        const result = await requestAPI<any>('cell-context', {
          method: 'POST',
          body: JSON.stringify({
            model,
            cell_content: cellContent,
            cell_type: cellType,
            question
          })
        });
        
        // Extract content from the response, handling both response formats
        if (result.message?.content) {
          // Old format
          setResponse(result.message.content);
        } else if (result.response) {
          // New direct API format
          setResponse(result.response);
        } else {
          // Fallback
          setResponse('No response could be extracted from the model');
          console.warn('Unexpected response format:', result);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error analyzing cell:', err);
        setError(`Error: ${err.message || 'Failed to analyze cell'}`);
        setLoading(false);
      }
    };

    analyzeCell();
  }, [cellContent, cellType, question, model]);

  // Format code in response using syntax highlighting
  const formatResponse = (text: string) => {
    // Simple markdown-like formatting
    return text.replace(
      /```([a-z]*)\n([\s\S]*?)```/g,
      '<pre class="code-block"><code>$2</code></pre>'
    );
  };

  return (
    <div className="ai-analysis-container">
      <div className="model-selector">
        <label>Model: </label>
        <select 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
        >
          {models.map((m, idx) => (
            <option key={idx} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="question-display">
        <strong>Question:</strong> {question}
      </div>

      <div className="code-preview">
        <strong>Cell Content:</strong>
        <pre>{cellContent}</pre>
      </div>

      <div className="response-container">
        <strong>AI Response:</strong>
        {loading ? (
          <div className="loading">Analyzing your code...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div 
            className="response-content"
            dangerouslySetInnerHTML={{ __html: formatResponse(response) }}
          />
        )}
      </div>
    </div>
  );
};

// Create a modal dialog for AI analysis
const showAIAnalysisDialog = (cellContent: string, cellType: string, question: string = 'Explain this code') => {
  // Create a ReactWidget to wrap our React component
  const content = ReactWidget.create(
    <AIAnalysisComponent 
      cellContent={cellContent} 
      cellType={cellType}
      question={question} 
    />
  );

  // Add custom class to the content widget for styling
  content.addClass('ai-analysis-dialog');

  return showDialog({
    title: 'AI Analysis',
    body: content,
    buttons: [Dialog.okButton()]
  });
};

// ReactJS component for displaying available models
const OllamaTestComponent: React.FC = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const availableModels = await getAvailableModels();
        setModels(availableModels || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching models:', error);
        setError('Failed to fetch models. Check the console for details.');
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (loading) {
    return <div>Loading models...</div>;
  }

  if (error) {
    return <div className="jp-error">{error}</div>;
  }

  return (
    <div className="jp-OllamaTest">
      <h2>Available Ollama Models</h2>
      {models.length > 0 ? (
        <ul>
          {models.map((model, index) => (
            <li key={index}>
              <strong>{model.name}</strong>
              {model.size && ` - Size: ${(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB`}
              {model.parameter_size && ` - Parameters: ${model.parameter_size}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No models found. Make sure Ollama is running and has models installed.</p>
      )}
    </div>
  );
};

// Function to create the OllamaTest widget
function createOllamaTestWidget(): MainAreaWidget<Widget> {
  const content = new Widget();
  const widget = new MainAreaWidget({ content });
  
  widget.id = 'jp-ollama-test';
  widget.title.label = 'Ollama Models';
  widget.title.closable = true;
  
  ReactDOM.render(<OllamaTestComponent />, content.node);
  
  return widget;
}

/**
 * Interface for launcher type if available
 */
interface ILauncher {
  add: (options: { command: string, category: string, rank: number }) => void;
}

/**
 * Initialization data for the jupyterlab-ai-assistant extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-ai-assistant:plugin',
  description: 'A JupyterLab extension for AI-assisted coding using Ollama',
  autoStart: true,
  optional: [
    ICommandPalette, 
    'launcher' as any, 
    ILayoutRestorer, 
    IMainMenu, 
    INotebookTracker, 
    IThemeManager,
    IToolbarWidgetRegistry,
    ISettingRegistry
  ],
  activate: (
    app: JupyterFrontEnd,
    palette?: ICommandPalette,
    launcher?: ILauncher,
    restorer?: ILayoutRestorer,
    mainMenu?: IMainMenu,
    notebookTracker?: INotebookTracker,
    themeManager?: IThemeManager,
    toolbarRegistry?: IToolbarWidgetRegistry,
    settingRegistry?: ISettingRegistry
  ) => {
    console.log('JupyterLab extension jupyterlab-ai-assistant is activated!');

    const { commands } = app;

    // Add the command for showing the Ollama Test widget
    const ollamaTestCommand = 'ai-assistant:show-ollama-test';
    commands.addCommand(ollamaTestCommand, {
      label: 'Show Available Ollama Models',
      execute: () => {
        const widget = createOllamaTestWidget();
        app.shell.add(widget, 'main');
        return widget;
      }
    });

    // Add the command to show the chat widget
    const chatCommand = 'ai-assistant:show-chat';
    commands.addCommand(chatCommand, {
      label: 'Open AI Assistant Chat',
      execute: () => {
        const widget = new ChatWidget({
          themeManager: themeManager
        });
        app.shell.add(widget, 'right', { rank: 1000 });
        return widget;
      }
    });

    // Array of predefined questions
    const questionTypes = [
      { id: 'explain', label: 'Explain this code', question: 'Explain this code in detail' },
      { id: 'optimize', label: 'Optimize this code', question: 'How can this code be optimized?' },
      { id: 'bugs', label: 'Find bugs', question: 'Are there any bugs or issues in this code?' },
      { id: 'overview', label: 'What does this do?', question: 'Provide a high-level overview of what this code does' }
    ];

    // Add commands for each question type
    questionTypes.forEach(questionType => {
      const commandId = `ai-assistant:analyze-cell-${questionType.id}`;
      commands.addCommand(commandId, {
        label: questionType.label,
        isEnabled: () => !!notebookTracker?.activeCell,
        execute: () => {
          if (!notebookTracker?.activeCell) {
            return;
          }

          const cell = notebookTracker.activeCell;
          const cellContent = cell.model.value.text;
          const cellType = cell instanceof CodeCell ? 'code' : 'markdown';

          showAIAnalysisDialog(cellContent, cellType, questionType.question);
          return true;
        }
      });
    });

    // Main analyze cell command (parent command)
    const analyzeCellCommand = 'ai-assistant:analyze-cell';
    commands.addCommand(analyzeCellCommand, {
      label: 'Ask AI about this cell',
      isEnabled: () => !!notebookTracker?.activeCell,
      execute: () => {
        // This command opens a submenu with all question types
        // But when triggered from the cell toolbar, default to the "explain" action
        return commands.execute('ai-assistant:analyze-cell-explain');
      }
    });

    // Register the cell toolbar button if toolbar registry is available
    if (toolbarRegistry && notebookTracker) {
      toolbarRegistry.registerFactory(
        'Cell',
        'askAI',
        (cell: Cell<ICellModel>) => {
          const button = new ToolbarButton({
            className: 'jp-AI-CellToolbarButton',
            tooltip: 'Ask AI about this cell',
            onClick: () => {
              // We need to activate the cell before executing the command
              if (notebookTracker.currentWidget) {
                const notebookPanel = notebookTracker.currentWidget;
                const cellIndex = notebookPanel.content.widgets.findIndex(c => c === cell);
                if (cellIndex >= 0) {
                  notebookPanel.content.activeCellIndex = cellIndex;
                }
              }
              
              // Create context menu with options instead of directly executing
              const cellNode = cell.node;
              const rect = cellNode.getBoundingClientRect();
              
              // Create and position the menu
              const menu = new Menu({ commands });
              
              // Add all question types to the menu
              questionTypes.forEach(type => {
                menu.addItem({
                  command: `ai-assistant:analyze-cell-${type.id}`,
                  args: {}
                });
              });
              
              // Calculate menu position with boundary checking
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              // Default position (to the right of the cell)
              let xPosition = rect.right + 10;
              let yPosition = rect.top;
              
              // Estimate menu width (we can't know exact size until it's rendered)
              const estimatedMenuWidth = 250; // based on css min-width
              const estimatedMenuHeight = questionTypes.length * 40 + 60; // rough estimate
              
              // Check if menu would go off the right edge of the screen
              if (xPosition + estimatedMenuWidth > viewportWidth) {
                // Position to the left of the cell instead
                xPosition = Math.max(0, rect.left - estimatedMenuWidth - 10);
              }
              
              // Check if menu would go off the bottom of the screen
              if (yPosition + estimatedMenuHeight > viewportHeight) {
                // Position menu above the cell if it would go off bottom
                yPosition = Math.max(0, viewportHeight - estimatedMenuHeight);
              }
              
              // Show the menu at the calculated position
              menu.open(xPosition, yPosition);
              
              return true;
            },
            label: 'Ask AI'
          });
          
          return button;
        }
      );
    }

    // Add a debug command to help test the cell toolbar buttons
    const debugCellToolbarCommand = 'ai-assistant:debug-cell-toolbar';
    commands.addCommand(debugCellToolbarCommand, {
      label: 'Debug Cell Toolbar Registration',
      execute: () => {
        console.log('Active Cell:', notebookTracker?.activeCell);
        console.log('Notebook APIs Available:', {
          notebookTracker: !!notebookTracker,
          toolbarRegistry: !!toolbarRegistry
        });
        
        // Log information about the current cell and its toolbar if available
        if (notebookTracker?.activeCell) {
          const cell = notebookTracker.activeCell;
          console.log('Cell Type:', cell.model.type);
          console.log('Cell Value:', cell.model.value.text);
        }
      }
    });

    // Add the commands to the command palette
    if (palette) {
      palette.addItem({ command: ollamaTestCommand, category: 'AI Assistant' });
      palette.addItem({ command: chatCommand, category: 'AI Assistant' });
      palette.addItem({ command: analyzeCellCommand, category: 'AI Assistant' });
      questionTypes.forEach(type => {
        palette.addItem({ 
          command: `ai-assistant:analyze-cell-${type.id}`, 
          category: 'AI Assistant' 
        });
      });
      palette.addItem({ command: debugCellToolbarCommand, category: 'AI Assistant' });
    }

    // Create an AI menu and add it to the main menu
    if (mainMenu) {
      const aiMenu = new Menu({ commands });
      aiMenu.title.label = 'AI Assistant';
      mainMenu.addMenu(aiMenu, { rank: 80 });
      
      aiMenu.addItem({ command: chatCommand });
      aiMenu.addItem({ command: ollamaTestCommand });
      
      // Add a submenu for cell analysis
      const cellAnalysisMenu = new Menu({ commands });
      cellAnalysisMenu.title.label = 'Cell Analysis';
      
      questionTypes.forEach(type => {
        cellAnalysisMenu.addItem({ 
          command: `ai-assistant:analyze-cell-${type.id}`
        });
      });
      
      aiMenu.addItem({ type: 'submenu', submenu: cellAnalysisMenu });
      aiMenu.addItem({ command: debugCellToolbarCommand });
    }

    // Add entries to the launcher
    if (launcher) {
      launcher.add({
        command: chatCommand,
        category: 'AI Assistant',
        rank: 1
      });
      
      launcher.add({
        command: ollamaTestCommand,
        category: 'AI Assistant',
        rank: 2
      });
    }
  }
};

export default plugin; 