
set -e

echo "Starting all TaskFlow services..."

SERVICES=(
  "Accounts-Service"
  "User-Service"
  "Projects-Service"
  "Sprints-Service"
  "Tasks-Service"
  "Notifications-Service"
  "common"
)

for SERVICE in "${SERVICES[@]}"
do
  echo "🚀 Starting $SERVICE..."
  mvn -pl "$SERVICE" spring-boot:run &
done

# Optional: Start Launcher-Service last
echo "🚀 Starting Launcher-Service..."
mvn -pl Launcher-Service spring-boot:run
