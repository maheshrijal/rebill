.PHONY: dev serve

# Start a local development server on port 3000
dev:
	@echo "Starting dev server at http://localhost:3000"
	@npx -y serve -l 3000 .

# Alternative using Python (no npm required)
serve:
	@echo "Starting dev server at http://localhost:3000"
	@python3 -m http.server 3000
