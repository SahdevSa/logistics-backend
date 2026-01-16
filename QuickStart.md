npm install
mysql -u root -p -e "CREATE DATABASE logistics_db;"
cp .env.example .env
npm run migration:run
npm run dev
