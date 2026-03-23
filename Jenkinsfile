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
                    credentialsId: 'github-pat'
            }
        }

        stage('Sync to App Directory') {
            steps {
                sh '''
                    # Sync checkout to app dir, preserving local-only files (.env.production etc.)
                    rsync -av --exclude='.env*' --exclude='.git' --exclude='node_modules' \
                        ${WORKSPACE}/ ${APP_DIR}/
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
