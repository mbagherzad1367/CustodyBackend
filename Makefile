THIS_FILE := $(lastword $(MAKEFILE_LIST))
.PHONY: build up start down destroy stop restart logs logs-wsgiserver ps db-shell python-shell

project_name = crypto-backend
compose_env_file = docker-compose.yml

help:
	make -pRrq  -f $(THIS_FILE) : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | egrep -v -e '^[^[:alnum:]]' -e '^$@$$'
build:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) build $(c)
up:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) up -d $(c)
up-attached:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) up --build $(c)
up-wsgiserver-attached:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) up --build wsgiserver
start:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) start $(c)
down:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) down $(c)
rm-wsgiserver:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) rm -fsv wsgiserver
destroy:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) down -v $(c)
stop:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) stop $(c)
restart: build stop up
restart-wsgiserver: rm-wsgiserver up
restart-wsgiserver-attached: rm-wsgiserver up-wsgiserver-attached
logs:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) logs --tail=100 -f $(c)
logs-wsgiserver:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) logs --tail=100 -f wsgiserver
ps:
	docker-compose -p $(project_name) -f docker-compose.yml -f $(compose_env_file) ps
db-shell:
	docker-compose -p $(project_name) -f docker-compose.yml exec postgres psql -Upostgres
django-shell:
	docker-compose -p $(project_name) -f docker-compose.yml exec wsgiserver python /app/manage.py shell_plus
rev:
	export GIT_REV=$(git rev-parse --short HEAD)
push:
	sudo docker tag crypto-admin-panel mbagherzad/crypto-admin-panel && sudo docker push mbagherzad/crypto-admin-panel:latest

