FROM --platform=$BUILDPLATFORM maven:3.9-eclipse-temurin-25@sha256:d67198007bb4441b07d45587320f83154de80ece3608f80408ef14c6ea847753 AS build
WORKDIR /build
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package

FROM eclipse-temurin:25-jre-alpine@sha256:3137541deb3cac6626b5d9a4a2187bc0d6a34312f858bd2c67dd01e732e6b682
RUN addgroup -S -g 10001 sifap && adduser -S -u 10001 -G sifap sifap
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/target/sifap-api-0.0.1-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=5s --start-period=60s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","/app/app.jar"]
