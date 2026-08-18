#!/usr/bin/env bash

set -o errexit

echo "==> Installing frontend dependencies"
cd frontend
npm ci

echo "==> Building React"
npm run build

echo "==> Installing backend dependencies"
cd ../backend
pip install -r requirements.txt

echo "==> Running migrations"
python manage.py migrate

echo "==> Creating admin superuser"
python manage.py createadmin

echo "==> Collecting static files"
python manage.py collectstatic --no-input

echo "==> Build completed"