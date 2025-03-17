#!/bin/bash

# Exit on error
set -e

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing jupyterlab-ai-assistant extension for development..."

# Install JupyterLab
echo "Installing JupyterLab..."
pip install jupyterlab==3.6.3

# Clean any previous build artifacts
echo "Cleaning previous builds..."
rm -rf lib/
rm -rf jupyterlab_ai_assistant/labextension/
rm -rf jupyterlab_ai_assistant/static/
rm -f tsconfig.tsbuildinfo

# Uninstall any existing extension to ensure clean install
echo "Uninstalling any existing extension..."
pip uninstall -y jupyterlab_ai_assistant
jupyter labextension uninstall --no-build jupyterlab-ai-assistant 2>/dev/null || true

# Install development dependencies
echo "Installing development dependencies..."
pip install jupyter_packaging
pip install jupyter-server==1.24.0  # Install specific version compatible with JupyterLab 3.x

# Install frontend dependencies
echo "Installing frontend dependencies..."
jlpm install

# Build the TypeScript code 
echo "Building TypeScript code..."
jlpm build:lib
jlpm build:labextension

# Create static directory and ensure it has the necessary files
echo "Setting up labextension files..."
mkdir -p jupyterlab_ai_assistant/static
cp -r jupyterlab_ai_assistant/labextension/* jupyterlab_ai_assistant/static/

# Install the extension in development mode
echo "Installing extension in development mode..."
pip install -e .

# Link the extension for development
#echo "Linking the extension for development..."
#jupyter labextension develop --overwrite .

# Build JupyterLab with the extension
echo "Building JupyterLab with the extension..."
jupyter lab build

echo "Listing JupyterLab extensions..."
jupyter labextension list

echo "Installation complete!"
echo "To use the extension:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Start JupyterLab: jupyter lab" 