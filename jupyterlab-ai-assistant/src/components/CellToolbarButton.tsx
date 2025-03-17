import React, { useState } from 'react';
import { notebookIcon } from '@jupyterlab/ui-components';
import { Cell } from '@jupyterlab/cells';

import { analyzeCellContent } from '../services/ollama';

interface CellContextMenuProps {
  cell: Cell;
  onClose: () => void;
  selectedModel: string;
}

const CellContextMenu: React.FC<CellContextMenuProps> = ({
  cell,
  onClose,
  selectedModel
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);

  const getCellContent = (): string => {
    return cell.model.value.text;
  };

  const getCellType = (): string => {
    if (cell.model.type === 'code') {
      return 'code';
    } else {
      return 'markdown';
    }
  };

  const handleQuestionSelect = async (question: string) => {
    setIsLoading(true);
    setResult(null);

    try {
      const content = getCellContent();
      const cellType = getCellType();
      
      const response = await analyzeCellContent(
        selectedModel,
        content,
        cellType,
        question
      );

      setResult(response.message?.content || 'No response from AI');
    } catch (error) {
      console.error('Error analyzing cell:', error);
      setResult('Error: Failed to analyze cell content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cell-context-menu">
      <div className="context-menu-header">
        <h4>Ask about this cell</h4>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="context-menu-options">
        <button
          onClick={() => handleQuestionSelect('Explain this code')}
          disabled={isLoading}
        >
          Explain this code
        </button>
        <button
          onClick={() => handleQuestionSelect('Optimize this code')}
          disabled={isLoading}
        >
          Optimize this code
        </button>
        <button
          onClick={() => handleQuestionSelect('Find bugs in this code')}
          disabled={isLoading}
        >
          Find bugs
        </button>
        <button
          onClick={() => handleQuestionSelect('What does this do?')}
          disabled={isLoading}
        >
          What does this do?
        </button>
      </div>

      {isLoading && <div className="loading-indicator">Loading...</div>}

      {result && (
        <div className="result-container">
          <h5>Analysis</h5>
          <div className="result-content">{result}</div>
        </div>
      )}
    </div>
  );
};

// Use an interface definition instead of class
export interface CellToolbarButtonOptions {
  className: string;
  onClick: () => void;
  tooltip: string;
  icon: any;
  label: string;
  cell: Cell;
}

export function createCellToolbarButton(cell: Cell): CellToolbarButtonOptions {
  return {
    className: 'jp-AI-CellToolbarButton',
    onClick: () => {
      // This will be overridden by the notebook extension
      console.log('Cell toolbar button clicked');
    },
    tooltip: 'Ask AI about this cell',
    icon: notebookIcon,
    label: 'Ask',
    cell
  };
}

export { CellContextMenu }; 