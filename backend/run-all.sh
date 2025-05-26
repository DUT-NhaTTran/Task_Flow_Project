set -e

echo "Starting all TaskFlow services..."

SERVICES=(
  "Accounts-Service"
  "User-Service"
  "Projects-Service"
  "Sprints-Service"
  "Tasks-Service"
  "Notifications-Service"
  "File-Service"
  "common"
  "AI-Service"
)

for SERVICE in "${SERVICES[@]}"
do
  echo "Starting $SERVICE..."
  mvn -pl "$SERVICE" spring-boot:run &
done

