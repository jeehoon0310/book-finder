pipeline {
    agent any

    environment {
        APP_DIR = '/volume1/docker/book-finder'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/jeehoon0310/book-finder.git',
                    credentialsId: 'github-credentials'
            }
        }

        stage('Sync to App Directory') {
            steps {
                sh '''
                    # Copy checkout to app dir, preserving local env files
                    cp -f ${WORKSPACE}/Dockerfile ${APP_DIR}/
                    cp -f ${WORKSPACE}/docker-compose.yml ${APP_DIR}/
                    cp -f ${WORKSPACE}/package.json ${APP_DIR}/
                    cp -f ${WORKSPACE}/package-lock.json ${APP_DIR}/
                    cp -f ${WORKSPACE}/tsconfig.json ${APP_DIR}/
                    cp -f ${WORKSPACE}/next.config.mjs ${APP_DIR}/
                    cp -f ${WORKSPACE}/postcss.config.mjs ${APP_DIR}/
                    cp -f ${WORKSPACE}/components.json ${APP_DIR}/ 2>/dev/null || true
                    cp -rf ${WORKSPACE}/src ${APP_DIR}/
                    cp -f ${WORKSPACE}/.dockerignore ${APP_DIR}/ 2>/dev/null || true
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                dir("${APP_DIR}") {
                    sh 'docker compose build --no-cache'
                }
            }
        }

        stage('Deploy') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                        docker compose down
                        docker compose up -d
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                retry(3) {
                    sh '''
                        sleep 10
                        curl -f http://localhost:3000 || exit 1
                    '''
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }

    post {
        success {
            echo 'Deploy succeeded!'
        }
        failure {
            echo 'Deploy failed — rollback may be needed'
        }
    }
}
