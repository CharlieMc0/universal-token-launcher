#!/bin/bash

set -e  # Exit on error

# Configuration
PROJECT_ID=${1:-"your-gcp-project-id"}  # Default or first argument
IMAGE_NAME="utl-backend"
TAG=${2:-"latest"}  # Default or second argument
REGISTRY="gcr.io"  # Google Container Registry

# Full image name
FULL_IMAGE_NAME="${REGISTRY}/${PROJECT_ID}/${IMAGE_NAME}:${TAG}"

echo "Building Docker image: ${FULL_IMAGE_NAME}"

# Build the Docker image
docker build -t ${FULL_IMAGE_NAME} .

echo "Docker image built successfully"

# Push to Google Container Registry
echo "Pushing image to ${REGISTRY}..."
docker push ${FULL_IMAGE_NAME}

echo "Image pushed successfully to: ${FULL_IMAGE_NAME}"
echo ""
echo "You can now deploy this image to Google Cloud Run or GKE with:"
echo "gcloud run deploy SERVICE_NAME --image ${FULL_IMAGE_NAME} --platform managed" 