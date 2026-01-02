.PHONY: help install dev build test test-watch test-coverage test-e2e test-e2e-ui test-all lint format clean docker-build docker-run check-deps

# Node modules directory
NODE_MODULES := node_modules

# Default target
help:
	@echo "Available targets:"
	@echo "  install        - Install dependencies"
	@echo "  dev            - Start development server"
	@echo "  build          - Build for production"
	@echo "  test           - Run unit tests"
	@echo "  test-watch     - Run unit tests in watch mode"
	@echo "  test-coverage  - Run unit tests with coverage"
	@echo "  test-e2e       - Run E2E tests (headless)"
	@echo "  test-e2e-ui    - Run E2E tests with UI"
	@echo "  test-all       - Run all tests (unit + E2E)"
	@echo "  lint           - Run linter"
	@echo "  format         - Format code"
	@echo "  clean          - Remove build artifacts"
	@echo "  docker-build   - Build Docker image"
	@echo "  docker-run     - Run Docker container"

# Check if dependencies are installed
check-deps:
	@if [ ! -d "$(NODE_MODULES)" ]; then \
		echo "Installing dependencies..."; \
		npm install; \
	fi

# Install dependencies
install:
	npm ci

# Start development server
dev: check-deps
	npm run dev

# Build for production
build: check-deps
	npm run build

# Run tests
test: check-deps
	npm run test

# Run tests in watch mode
test-watch: check-deps
	npm run test:watch

# Run tests with coverage
test-coverage: check-deps
	npm run test:coverage

# Run E2E tests (headless)
test-e2e: check-deps
	@if [ ! -d "$(NODE_MODULES)/.cache/ms-playwright" ]; then \
		echo "Installing Playwright browsers..."; \
		npm run playwright:install; \
	fi
	npm run test:e2e

# Run E2E tests with UI
test-e2e-ui: check-deps
	@if [ ! -d "$(NODE_MODULES)/.cache/ms-playwright" ]; then \
		echo "Installing Playwright browsers..."; \
		npm run playwright:install; \
	fi
	npm run test:e2e:ui

# Run all tests (unit + E2E)
test-all: test test-e2e

# Run linter
lint: check-deps
	npm run lint

# Format code
format: check-deps
	npm run format

# Clean build artifacts
clean:
	rm -rf dist node_modules coverage playwright-report test-results

# Build Docker image
docker-build:
	docker build -t shopping-cart/frontend:latest \
		--build-arg VITE_KEYCLOAK_URL=http://localhost:8080 \
		--build-arg VITE_KEYCLOAK_REALM=shopping-cart \
		--build-arg VITE_CLIENT_ID=frontend \
		.

# Run Docker container
docker-run:
	docker run -p 3000:80 shopping-cart/frontend:latest
