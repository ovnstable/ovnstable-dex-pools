## Установка

```bash
# install dependencies
npm install
```

## Запуск приложения

Create .env from .env.example

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Deploy
1. Init ssh [link](https://www.cyberciti.biz/faq/how-to-set-up-ssh-keys-on-linux-unix/)
2. Create file `config` inside ~/.ssh
```bash
# run for checking connection
ssh pools_ovn
```

```bash
# config
Host pools_ovn
HostName 3.120.26.25
User ubuntu
Port 22
IdentityFile ~/.ssh/id_rsa
```
3. run 
```bash
sh deploy.sh <token> pools_ovn prod
```
