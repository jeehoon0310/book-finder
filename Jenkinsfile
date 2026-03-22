pipeline {
    agent any

    environment {
        SUPABASE_URL = credentials('supabase-url')
        SUPABASE_ANON_KEY = credentials('supabase-anon-key')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build \
                        --build-arg NEXT_PUBLIC_SUPABASE_URL=\${SUPABASE_URL} \
                        --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY} \
                        -t book-finder:\${BUILD_NUMBER} \
                        -t book-finder:latest .
                """
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker stop book-finder || true
                    docker rm book-finder || true
                    docker run -d \
                        --name book-finder \
                        --restart unless-stopped \
                        -p 3000:3000 \
                        book-finder:latest
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh 'sleep 5 && curl -f http://localhost:3000 || exit 1'
            }
        }
    }

    post {
        failure {
            echo 'Build or deploy failed!'
        }
        success {
            echo "Deployed book-finder build #${BUILD_NUMBER} successfully!"
        }
    }
}
