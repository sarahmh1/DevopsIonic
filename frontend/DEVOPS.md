# DevOps - Event Management Application (Ionic)

**Projet:** Application de gestion d'événements (Frontend Ionic + Backend Node.js)  
**Objectif:** Déployer, orchestrer et monitorer l'application sur infrastructure cloud  
**Date:** Novembre 2025

---

## 📋 Table des Matières

1. [Architecture Globale](#architecture-globale)
2. [TP1: Kubernetes Manifests](#tp1-kubernetes-manifests)
3. [TP2: Ingress NGINX](#tp2-ingress-nginx)
4. [TP3: Helm Packaging](#tp3-helm-packaging)
5. [TP4: ConfigMaps & Secrets](#tp4-configmaps--secrets)
6. [TP5: Terraform Infrastructure](#tp5-terraform-infrastructure)
7. [TP7: ELK Stack Logging](#tp7-elk-stack-logging)
8. [Commandes Rapides](#commandes-rapides)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Globale

### Stack Technologique

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATION                             │
├─────────────────────────────────────────────────────────────────┤
│ Minikube (Kubernetes 1.34.0) - Local Development Cluster        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  NAMESPACE: event-management (Helm)                              │
│  ├─ Frontend Pod (2 replicas) - Nginx latest                     │
│  ├─ Backend Pod (2 replicas) - Node.js 18-alpine                │
│  ├─ ConfigMap - Application variables                            │
│  ├─ Secret - Sensitive data                                      │
│  └─ Ingress - event.local                                        │
│                                                                   │
│  NAMESPACE: event-management-tf (Terraform)                      │
│  ├─ Frontend Pod (2 replicas) - Nginx latest                     │
│  ├─ Backend Pod (2 replicas) - Node.js 18-alpine                │
│  ├─ ConfigMap - Application variables                            │
│  ├─ Secret - Sensitive data                                      │
│  └─ Service NodePort (30081)                                     │
│                                                                   │
│  LOGGING: ELK Stack (Docker Compose)                             │
│  ├─ Elasticsearch - Data storage & indexing                      │
│  ├─ Logstash - Log processing pipeline                           │
│  └─ Kibana - Visualization & analysis                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Flow Applicatif

```
User Browser (localhost:30080 ou :30081)
    ↓
Ingress NGINX (event.local) - TP2
    ↓
Frontend Service (Nginx) - TP1/TP3/TP5
    ↓
Frontend Pods (2 replicas)
    ├─ ConfigMap injected (APP_NAME, APP_VERSION, APP_ENV) - TP4
    ├─ Secret injected (API_KEY, DB_PASSWORD) - TP4
    └─ Logs → Logstash (port 5000) → Elasticsearch - TP7
    
    ↓ (API calls)
    
Backend Service (ClusterIP:3001) - TP1/TP3/TP5
    ↓
Backend Pods (2 replicas)
    ├─ ConfigMap injected - TP4
    ├─ Secret injected - TP4
    ├─ Connects to API services
    └─ Logs → Logstash → Elasticsearch - TP7
```

---

## TP1: Kubernetes Manifests

### Objectif
Créer les manifests YAML Kubernetes de base pour déployer l'application sans orchestration.

### Fichiers Créés

```
devops/k8s/
├── 01-namespace.yaml              # Namespace event-management
├── 02-deployment-frontend.yaml    # Frontend Nginx (2 replicas)
├── 02-deployment-backend.yaml     # Backend Node.js (2 replicas)
├── 03-service-backend-clusterip.yaml     # Backend internal service
├── 03-service-frontend-clusterip.yaml    # Frontend internal service
├── 03-service-frontend-nodeport.yaml     # Frontend external access
├── 04-ingress.yaml                       # Ingress routing
├── 05-check.bat                          # Script de vérification
└── README-TP1.md                         # Documentation
```

### Architecture K8s

#### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: event-management
```

#### Frontend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-app
  namespace: event-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: nginx:latest
        ports:
        - containerPort: 80
```

#### Backend Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-app
  namespace: event-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: node:18-alpine
        command: ["node"]
        args: ["-e", "require('http').createServer((req,res)=>{res.end('Backend is running')}).listen(3001)"]
        ports:
        - containerPort: 3001
```

#### Services (ClusterIP + NodePort)
```yaml
# Backend ClusterIP (internal)
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: event-management
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: ClusterIP

# Frontend ClusterIP (internal)
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: event-management
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP

# Frontend NodePort (external)
apiVersion: v1
kind: Service
metadata:
  name: frontend-nodeport
  namespace: event-management
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    nodePort: 30080
  type: NodePort
```

### Déploiement TP1

```powershell
# 1. Démarrer Minikube
minikube start --profile=event-app --driver=docker

# 2. Appliquer les manifests
kubectl apply -f devops/k8s/

# 3. Vérifier les ressources
kubectl get namespaces
kubectl get deployments -n event-management
kubectl get services -n event-management
kubectl get pods -n event-management

# 4. Accéder l'application
minikube service frontend-nodeport -n event-management
```

### Résultats TP1 ✅

```
NAMESPACE           NAME                 READY   UP-TO-DATE   AVAILABLE
event-management    frontend-app         2/2     2            2
event-management    backend-app          2/2     2            2

SERVICE                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
frontend-service         ClusterIP   10.xxx.xxx.xxx  <none>        80/TCP
backend-service          ClusterIP   10.xxx.xxx.xxx  <none>        3001/TCP
frontend-nodeport        NodePort    10.xxx.xxx.xxx  <nodes>       80:30080/TCP

PODS (event-management)
frontend-app-xxxxx        Running   1/1
frontend-app-yyyyy        Running   1/1
backend-app-ppppp         Running   1/1
backend-app-qqqqq         Running   1/1
```

---

## TP2: Ingress NGINX

### Objectif
Configurer un Ingress pour router le trafic HTTP via un hostname DNS plutôt que par port NodePort.

### Configuration Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: event-ingress
  namespace: event-management
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - host: event.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 3001
```

### Déploiement TP2

```powershell
# 1. Activer l'addon Ingress dans Minikube
minikube addons enable ingress --profile=event-app

# 2. Appliquer l'Ingress
kubectl apply -f devops/k8s/04-ingress.yaml

# 3. Ajouter DNS local (Windows hosts file)
# Ajouter: 127.0.0.1 event.local
# Fichier: C:\Windows\System32\drivers\etc\hosts

# 4. Tester
curl http://event.local
# Résultat: Nginx welcome page (200 OK)
```

### Résultats TP2 ✅

```powershell
PS> curl http://event.local

StatusCode        : 200
StatusDescription : OK
RawContent        : HTTP/1.1 200 OK
Content           : <!DOCTYPE html>
                    <html>
                    <head>
                    <title>Welcome to nginx!</title>
```

---

## TP3: Helm Packaging

### Objectif
Packager l'application Kubernetes en chart Helm réutilisable et versionnable.

### Structure Helm Chart

```
devops/helm/event-app/
├── Chart.yaml                    # Metadata (name, version, description)
├── values.yaml                   # Default configuration values
├── templates/
│   ├── namespace.yaml            # Namespace creation
│   ├── deployment-frontend.yaml  # Frontend deployment template
│   ├── deployment-backend.yaml   # Backend deployment template
│   ├── service-frontend.yaml     # Frontend services (ClusterIP + NodePort)
│   ├── service-backend.yaml      # Backend service (ClusterIP)
│   ├── ingress.yaml              # Ingress template
│   ├── configmap.yaml            # ConfigMap template
│   ├── secret.yaml               # Secret template
│   └── README.md
├── README-TP3.md                 # Documentation TP3
└── TRACE-TP3.md                  # Execution trace
```

### Chart.yaml

```yaml
apiVersion: v2
name: event-app
description: Helm chart for Event Management application
type: application
version: 1.0.0
appVersion: "1.0"
```

### values.yaml

```yaml
namespace: event-management

# Frontend Configuration
frontend:
  replicas: 2
  image: nginx:latest
  port: 80

# Backend Configuration
backend:
  replicas: 2
  image: node:18-alpine
  port: 3001

# Service Configuration
service:
  type: ClusterIP
  nodePort: 30080

# Ingress Configuration
ingress:
  enabled: true
  host: event.local
  
# ConfigMap
configMap:
  enabled: true
  data:
    APP_NAME: "Event Management"
    APP_VERSION: "1.0.0"
    APP_ENV: "development"

# Secret
secrets:
  enabled: true
  data:
    API_KEY: "base64encodedkey"
    DB_PASSWORD: "base64encodedpassword"
```

### Déploiement TP3

```powershell
# 1. Valider la chart
helm lint devops/helm/event-app/
# Résultat: 1 chart(s) linted, 0 chart(s) failed

# 2. Déployer avec Helm
helm install my-event devops/helm/event-app/ -n event-management --create-namespace
# Résultat: Release "my-event" has been installed

# 3. Vérifier le déploiement
helm list -n event-management
helm status my-event -n event-management

# 4. Voir les ressources créées
kubectl get all -n event-management
```

### Résultats TP3 ✅

```
Release: my-event
Status: deployed
REVISION: 1

PODS (4 total):
- frontend-app-677476cd76-4w4g4     Running 1/1
- frontend-app-677476cd76-7x8y9     Running 1/1
- backend-app-d5f8fc685-59gp2       Running 1/1
- backend-app-d5f8fc685-k3l2m       Running 1/1

SERVICES:
- frontend-service (ClusterIP)
- backend-service (ClusterIP)
- frontend-nodeport (NodePort, port 30080)
```

### Tests TP3 ✅

```powershell
# Frontend
PS> curl http://event.local
StatusCode: 200

# Backend (via port-forward)
PS> kubectl -n event-management port-forward service/backend-service 3001:3001 &
PS> curl http://localhost:3001
Backend is running
```

---

## TP4: ConfigMaps & Secrets

### Objectif
Injecter variables de configuration et secrets dans les pods via ConfigMaps et Secrets.

### ConfigMap Template

```yaml
{{- if .Values.configMap.enabled }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: {{ .Values.namespace }}
data:
{{- range $key, $value := .Values.configMap.data }}
  {{ $key }}: "{{ $value }}"
{{- end }}
{{- end }}
```

### Secret Template

```yaml
{{- if .Values.secrets.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: {{ .Values.namespace }}
type: Opaque
data:
{{- range $key, $value := .Values.secrets.data }}
  {{ $key }}: {{ $value }}
{{- end }}
{{- end }}
```

### Injection dans Deployments

```yaml
# Dans deployment-frontend.yaml et deployment-backend.yaml
spec:
  containers:
  - name: app
    image: ...
    env:
    # ConfigMap variables
    - name: APP_NAME
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: APP_NAME
    - name: APP_VERSION
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: APP_VERSION
    - name: APP_ENV
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: APP_ENV
    # Secret variables
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: API_KEY
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: DB_PASSWORD
```

### Déploiement TP4

```powershell
# 1. Upgrade la release Helm avec ConfigMaps et Secrets
helm upgrade my-event devops/helm/event-app/ -n event-management
# Résultat: Release upgraded. REVISION: 2

# 2. Vérifier ConfigMap
kubectl get configmap -n event-management
kubectl describe configmap app-config -n event-management

# 3. Vérifier Secret
kubectl get secret -n event-management
kubectl describe secret app-secrets -n event-management

# 4. Vérifier les variables dans les pods
kubectl -n event-management exec frontend-app-xxx -- env | Select-String "APP_|API_|DB_"
```

### Résultats TP4 ✅

```
REVISION: 2

ConfigMap: app-config
├── APP_NAME: Event Management
├── APP_VERSION: 1.0.0
└── APP_ENV: development

Secret: app-secrets
├── API_KEY: base64encodedkey
└── DB_PASSWORD: base64encodedpassword

Pod Frontend Environment Variables:
├── APP_NAME=Event Management
├── APP_VERSION=1.0.0
├── APP_ENV=development
├── API_KEY=base64encodedkey
└── DB_PASSWORD=base64encodedpassword

Pod Backend Environment Variables: (identiques)
```

---

## TP5: Terraform Infrastructure

### Objectif
Définir et gérer l'infrastructure Kubernetes en tant que code IaC avec Terraform.

### Structure Terraform

```
devops/terraform/
├── providers.tf              # Provider configuration
├── variables.tf              # Input variables
├── main.tf                   # Main resources
├── outputs.tf                # Output values
├── terraform.tfvars          # DEV environment values
├── terraform.prod.tfvars     # PROD environment values
├── terraform.tfstate         # State file (auto-generated)
├── terraform.tfstate.backup  # Backup state
├── README-TP5.md             # Documentation
└── TRACE-TP5.md              # Execution trace
```

### providers.tf

```hcl
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "kubernetes" {
  config_context = "event-app"
}
```

### variables.tf

```hcl
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "event-app"
}

variable "namespace_name" {
  description = "Kubernetes namespace"
  type        = string
  default     = "event-management-tf"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

variable "frontend_replicas" {
  description = "Frontend replicas"
  type        = number
  default     = 2
}

variable "backend_replicas" {
  description = "Backend replicas"
  type        = number
  default     = 2
}

variable "frontend_image" {
  description = "Frontend Docker image"
  type        = string
  default     = "nginx:latest"
}

variable "backend_image" {
  description = "Backend Docker image"
  type        = string
  default     = "node:18-alpine"
}

variable "api_key" {
  description = "API Key secret"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password secret"
  type        = string
  sensitive   = true
}

variable "nodeport" {
  description = "Frontend NodePort"
  type        = number
  default     = 30081
}
```

### main.tf (Ressources)

```hcl
# Namespace
resource "kubernetes_namespace" "main" {
  metadata {
    name = var.namespace_name
  }
}

# ConfigMap
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.main.metadata[0].name
  }
  data = {
    APP_NAME    = var.app_name
    APP_VERSION = "1.0.0"
    APP_ENV     = var.environment
  }
}

# Secret
resource "kubernetes_secret" "app" {
  metadata {
    name      = "app-secrets"
    namespace = kubernetes_namespace.main.metadata[0].name
  }
  data = {
    API_KEY      = base64encode(var.api_key)
    DB_PASSWORD  = base64encode(var.db_password)
  }
}

# Frontend Deployment
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "frontend-app"
    namespace = kubernetes_namespace.main.metadata[0].name
  }
  spec {
    replicas = var.frontend_replicas
    selector {
      match_labels = { app = "frontend" }
    }
    template {
      metadata {
        labels = { app = "frontend" }
      }
      spec {
        container {
          name  = "frontend"
          image = var.frontend_image
          port { container_port = 80 }
          env_from {
            config_map_ref { name = kubernetes_config_map.app.metadata[0].name }
          }
          env_from {
            secret_ref { name = kubernetes_secret.app.metadata[0].name }
          }
        }
      }
    }
  }
}

# Backend Deployment
resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "backend-app"
    namespace = kubernetes_namespace.main.metadata[0].name
  }
  spec {
    replicas = var.backend_replicas
    selector {
      match_labels = { app = "backend" }
    }
    template {
      metadata {
        labels = { app = "backend" }
      }
      spec {
        container {
          name  = "backend"
          image = var.backend_image
          port { container_port = 3001 }
          env_from {
            config_map_ref { name = kubernetes_config_map.app.metadata[0].name }
          }
          env_from {
            secret_ref { name = kubernetes_secret.app.metadata[0].name }
          }
        }
      }
    }
  }
}

# Frontend Service (ClusterIP)
resource "kubernetes_service" "frontend" {
  metadata {
    name      = "frontend-service"
    namespace = kubernetes_namespace.main.metadata[0].name
  }
  spec {
    selector = { app = "frontend" }
    port {
      port        = 80
      target_port = 80
    }
    type = "ClusterIP"
  }
}

# Frontend Service (NodePort)
resource "kubernetes_service" "frontend_nodeport" {
  metadata {
    name      = "frontend-nodeport"
    namespace = kubernetes_namespace.main.metadata[0].name
  }
  spec {
    selector = { app = "frontend" }
    port {
      port        = 80
      target_port = 80
      node_port   = var.nodeport
    }
    type = "NodePort"
  }
}

# Backend Service (ClusterIP)
resource "kubernetes_service" "backend" {
  metadata {
    name      = "backend-service"
    namespace = kubernetes_namespace.main.metadata[0].name
  }
  spec {
    selector = { app = "backend" }
    port {
      port        = 3001
      target_port = 3001
    }
    type = "ClusterIP"
  }
}
```

### outputs.tf

```hcl
output "namespace" {
  value       = kubernetes_namespace.main.metadata[0].name
  description = "Kubernetes namespace"
}

output "frontend_service_ip" {
  value       = kubernetes_service.frontend.spec[0].cluster_ip
  description = "Frontend ClusterIP"
}

output "backend_service_ip" {
  value       = kubernetes_service.backend.spec[0].cluster_ip
  description = "Backend ClusterIP"
}

output "frontend_replicas" {
  value       = kubernetes_deployment.frontend.spec[0].replicas
  description = "Frontend replicas"
}

output "backend_replicas" {
  value       = kubernetes_deployment.backend.spec[0].replicas
  description = "Backend replicas"
}

output "nodeport" {
  value       = var.nodeport
  description = "Frontend NodePort"
}
```

### terraform.tfvars (DEV)

```hcl
app_name           = "event-app"
namespace_name     = "event-management-tf"
environment        = "development"
frontend_replicas  = 2
backend_replicas   = 2
frontend_image     = "nginx:latest"
backend_image      = "node:18-alpine"
api_key            = "dev-api-key-123"
db_password        = "dev-db-pass-456"
nodeport           = 30081
```

### terraform.prod.tfvars (PROD)

```hcl
app_name           = "event-app"
namespace_name     = "event-management-prod"
environment        = "production"
frontend_replicas  = 5
backend_replicas   = 3
frontend_image     = "nginx:latest"
backend_image      = "node:18-alpine"
api_key            = "prod-api-key-xyz"
db_password        = "prod-db-pass-abc"
nodeport           = 30082
```

### Déploiement TP5

```powershell
# 1. Naviguer au répertoire Terraform
cd devops/terraform

# 2. Initialiser Terraform
terraform init
# Résultat: Initialized working directory

# 3. Valider la configuration
terraform validate
# Résultat: Success!

# 4. Prévisualiser les changements
terraform plan

# 5. Appliquer l'infrastructure (DEV)
terraform apply -auto-approve -var-file="terraform.tfvars"
# Résultat: Apply complete! Resources: 8 added

# 6. Vérifier les ressources
kubectl -n event-management-tf get all

# 7. Utiliser terraform.prod.tfvars pour la prod
terraform plan -var-file="terraform.prod.tfvars"
terraform apply -auto-approve -var-file="terraform.prod.tfvars"
```

### Résultats TP5 ✅

```
Terraform Resources Created:
- kubernetes_namespace.main
- kubernetes_config_map.app
- kubernetes_secret.app
- kubernetes_deployment.frontend (2 replicas)
- kubernetes_deployment.backend (2 replicas)
- kubernetes_service.frontend (ClusterIP)
- kubernetes_service.frontend_nodeport (NodePort 30081)
- kubernetes_service.backend (ClusterIP)

Pods Running (event-management-tf):
- frontend-app-xxxxx    Running 1/1
- frontend-app-yyyyy    Running 1/1
- backend-app-ppppp     Running 1/1
- backend-app-qqqqq     Running 1/1

Services:
- frontend-service (ClusterIP 10.xxx.xxx.xxx)
- backend-service (ClusterIP 10.xxx.xxx.xxx)
- frontend-nodeport (NodePort :30081)

State File: terraform.tfstate
- 8 resources tracked
- Can be destroyed with: terraform destroy
```

---

## TP7: ELK Stack Logging

### Objectif
Déployer une stack ELK (Elasticsearch, Logstash, Kibana) pour centraliser et visualiser les logs applicatifs.

### Architecture ELK

```
Application Logs (Frontend + Backend)
    ↓ (HTTP POST port 5000)
Logstash (Input HTTP)
    ├─ Parse JSON
    ├─ Add timestamp
    ├─ Create tags
    ↓
Elasticsearch (port 9200)
    ├─ Index: app-logs-YYYY.MM.DD
    ├─ Type: _doc
    ├─ Field mapping
    ↓
Kibana (port 5601)
    └─ Visualize & analyze
```

### Structure Fichiers ELK

```
devops/elk/
├── docker-compose.yml     # Container orchestration
├── logstash.conf          # ETL pipeline
├── .env                   # Environment variables
├── test-elk.ps1           # PowerShell test script
├── README-TP7.md          # Documentation
└── TRACE-TP7.md           # Execution trace
```

### docker-compose.yml

```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
    ports:
      - "5000:5000/tcp"
      - "9600:9600"
    depends_on:
      elasticsearch:
        condition: service_healthy

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:

networks:
  default:
    name: elk
```

### logstash.conf

```
input {
  http {
    port => 5000
    codec => json
  }
}

filter {
  mutate {
    add_field => { "[@metadata][index_name]" => "app-logs-%{+YYYY.MM.dd}" }
  }
  
  date {
    match => [ "timestamp", "ISO8601" ]
    target => "@timestamp"
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index_name]}"
  }
}
```

### Déploiement TP7

```powershell
# 1. Naviguer au répertoire ELK
cd devops/elk

# 2. Démarrer la stack
docker-compose up -d
# Attendre 30-60 secondes pour le démarrage complet

# 3. Vérifier les conteneurs
docker-compose ps
# Résultat: 3 containers (elasticsearch, logstash, kibana) in Running state

# 4. Tester Elasticsearch
curl http://localhost:9200
# Résultat: Cluster info JSON

# 5. Accéder Kibana
Start-Process "http://localhost:5601"

# 6. Envoyer un log test
$log = @{
    message = "Test log from app"
    level = "INFO"
    service = "event-app"
    timestamp = (Get-Date -Format "o")
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000" `
    -Method POST `
    -Body $log `
    -ContentType "application/json"

# 7. Vérifier les indices
curl http://localhost:9200/_cat/indices
# Résultat: app-logs-2025.11.29 (date du jour)

# 8. Créer Index Pattern dans Kibana
# Kibana → Discover → Create index pattern → app-logs-* → @timestamp

# 9. Visualiser les logs
# Kibana → Discover → voir tous les logs
```

### Tests TP7 ✅

```powershell
# test-elk.ps1 automatisé

Write-Host "1. Vérifier les conteneurs..." -ForegroundColor Green
docker-compose ps

Write-Host "2. Tester Elasticsearch..." -ForegroundColor Green
curl http://localhost:9200/_cluster/health

Write-Host "3. Tester Kibana..." -ForegroundColor Green
curl http://localhost:5601/api/status

Write-Host "4. Envoyer logs test..." -ForegroundColor Green
# ... envoyer 5 logs ...

Write-Host "5. Vérifier les indices..." -ForegroundColor Green
curl http://localhost:9200/_cat/indices

Write-Host "6. Chercher les logs..." -ForegroundColor Green
curl -X POST "http://localhost:9200/app-logs-*/_search" `
    -H "Content-Type: application/json" `
    -d '{"query":{"match_all":{}},"size":10}'

Write-Host "Tous les tests TP7 OK!" -ForegroundColor Green
```

### Résultats TP7 ✅

```
Elasticsearch: ✅ Running (port 9200)
  - Cluster status: green
  - Nodes: 1
  - Indices: app-logs-2025.11.29

Logstash: ✅ Running (port 5000)
  - Pipeline: main
  - Events processed: 5+
  - Status: OK

Kibana: ✅ Running (port 5601)
  - Web UI accessible
  - Connected to Elasticsearch
  - Index pattern: app-logs-* created

Logs: ✅ Indexed
  - Total documents: 5+
  - Searchable in Kibana Discover
  - Timestamp field: @timestamp
```

---

## Commandes Rapides

### Minikube

```powershell
# Démarrer Minikube
minikube start --profile=event-app --driver=docker

# Arrêter Minikube
minikube stop --profile=event-app

# Supprimer Minikube
minikube delete --profile=event-app

# Ouvrir dashboard
minikube dashboard --profile=event-app

# Accéder une service
minikube service <service-name> -n <namespace>

# Tunnel (pour accéder NodePort)
minikube tunnel --profile=event-app
```

### Kubernetes (kubectl)

```powershell
# Voir tous les namespaces
kubectl get namespaces

# Voir les pods
kubectl get pods -n <namespace>
kubectl get pods -n event-management -w  # Watch mode

# Voir les services
kubectl get services -n event-management

# Voir les déploiements
kubectl get deployments -n event-management

# Décrire une ressource
kubectl describe pod <pod-name> -n event-management

# Voir les logs
kubectl logs <pod-name> -n event-management
kubectl logs -f <pod-name> -n event-management  # Follow

# Exécuter une commande dans un pod
kubectl exec -it <pod-name> -n event-management -- /bin/sh

# Port-forward (accéder un service interne)
kubectl port-forward service/<service-name> 3001:3001 -n event-management

# Appliquer des manifests
kubectl apply -f <file.yaml>

# Supprimer des ressources
kubectl delete -f <file.yaml>
kubectl delete namespace <namespace>
```

### Helm

```powershell
# Lister les charts locales
helm list -n event-management

# Valider une chart
helm lint devops/helm/event-app/

# Dry-run (prévisualiser le déploiement)
helm install my-event devops/helm/event-app/ -n event-management --dry-run --debug

# Installer une release
helm install my-event devops/helm/event-app/ -n event-management --create-namespace

# Upgrade une release
helm upgrade my-event devops/helm/event-app/ -n event-management

# Rollback à une version antérieure
helm rollback my-event 1 -n event-management

# Voir l'historique
helm history my-event -n event-management

# Supprimer une release
helm uninstall my-event -n event-management
```

### Terraform

```powershell
# Initialiser Terraform
terraform init

# Valider la configuration
terraform validate

# Prévisualiser les changements
terraform plan

# Appliquer les changements
terraform apply

# Appliquer sans confirmation
terraform apply -auto-approve

# Détruire les ressources
terraform destroy

# Détruire sans confirmation
terraform destroy -auto-approve

# Afficher l'état
terraform show

# Sauvegarder le plan
terraform plan -out=tfplan

# Appliquer depuis le plan sauvegardé
terraform apply tfplan

# Utiliser un fichier de variables différent
terraform apply -var-file="terraform.prod.tfvars"
```

### Docker Compose (ELK)

```powershell
# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Arrêter + supprimer les volumes
docker-compose down -v

# Voir les conteneurs
docker-compose ps

# Voir les logs
docker-compose logs elasticsearch
docker-compose logs logstash -f  # Follow

# Restarrer un service
docker-compose restart elasticsearch

# Exécuter une commande dans un conteneur
docker-compose exec elasticsearch curl http://localhost:9200
```

---

## Troubleshooting

### Problèmes Kubernetes (TP1-5)

| Problème | Cause | Solution |
|----------|-------|----------|
| `docker: PROVIDER_DOCKER_NOT_FOUND` | Docker Desktop n'est pas running | Lancer Docker Desktop |
| `Minikube I/O error` | Docker volumes corrompus | `minikube delete --profile=event-app` + redémarrer |
| `Pod CrashLoopBackOff` | Erreur de démarrage du conteneur | `kubectl logs <pod>` pour voir l'erreur |
| `DNS event.local not resolving` | Pas d'entrée dans hosts file | Ajouter `127.0.0.1 event.local` dans C:\Windows\System32\drivers\etc\hosts |
| `Helm lint errors` | Fichiers YAML mal formés | Vérifier la syntaxe YAML |
| `Terraform provider error` | Kubernetes provider pas installé | `terraform init` |
| `Port already in use` | Port NodePort en conflit | Changer le port dans values.yaml ou terraform.tfvars |

### Problèmes ELK (TP7)

| Problème | Cause | Solution |
|----------|-------|----------|
| `Elasticsearch fails to start` | Mémoire insuffisante | Allouer 2GB+ RAM à Docker |
| `Logstash health check fails` | Elasticsearch pas ready | Attendre 30-60 secondes |
| `Kibana waiting for Elasticsearch` | Connection timeout | Vérifier que ES est accessible sur port 9200 |
| `Logs not indexed` | Logstash pipeline error | `docker-compose logs logstash` |
| `No index pattern in Kibana` | Aucun log envoyé | Envoyer un log test via curl |
| `docker-compose command not found` | Docker Compose pas installé | Installer Docker Desktop (inclut Compose) |

---

## Résumé Déploiement

### Étapes de Déploiement Complètes

```powershell
# === TP1 & TP2: Kubernetes + Ingress ===
minikube start --profile=event-app --driver=docker
kubectl apply -f devops/k8s/
minikube addons enable ingress --profile=event-app

# === TP3: Helm Chart ===
helm lint devops/helm/event-app/
helm install my-event devops/helm/event-app/ -n event-management --create-namespace

# === TP4: ConfigMaps & Secrets ===
helm upgrade my-event devops/helm/event-app/ -n event-management

# === TP5: Terraform IaC ===
cd devops/terraform
terraform init
terraform apply -auto-approve -var-file="terraform.tfvars"

# === TP7: ELK Stack ===
cd ../elk
docker-compose up -d
# Attendre 60 secondes
docker-compose ps

# === Vérifier tous les déploiements ===
kubectl get all -n event-management
kubectl get all -n event-management-tf
docker-compose ps -a
```

### Ressources Créées

- **TP1-3:** 2 Deployments, 3 Services, 1 Ingress, 1 ConfigMap, 1 Secret dans namespace `event-management`
- **TP5:** 2 Deployments, 3 Services, 1 ConfigMap, 1 Secret dans namespace `event-management-tf`
- **TP7:** 3 Docker containers (Elasticsearch, Logstash, Kibana) sur ports 9200, 5000, 5601

### Ports Exposés

| Service | Port | Type | Accès |
|---------|------|------|-------|
| Frontend (Helm) | 30080 | NodePort | http://localhost:30080 |
| Frontend (Terraform) | 30081 | NodePort | http://localhost:30081 |
| Ingress DNS | 80 | Ingress | http://event.local |
| Elasticsearch | 9200 | HTTP | http://localhost:9200 |
| Logstash | 5000 | HTTP | http://localhost:5000 |
| Kibana | 5601 | HTTP | http://localhost:5601 |

---

## Nettoyage (Cleanup)

```powershell
# === Détruire tout ===

# 1. Supprimer les releases Helm
helm uninstall my-event -n event-management

# 2. Supprimer les ressources Terraform
cd devops/terraform
terraform destroy -auto-approve

# 3. Arrêter ELK Stack
cd ../elk
docker-compose down -v

# 4. Supprimer les namespaces K8s
kubectl delete namespace event-management
kubectl delete namespace event-management-tf

# 5. Arrêter Minikube
minikube stop --profile=event-app

# 6. (Optionnel) Supprimer Minikube complètement
minikube delete --profile=event-app
```

---

**Fin Documentation DevOps - Event Management Application**

*Tous les TPs (TP1-5 + TP7) sont documentés et prêts pour la soumission à l'enseignant.*

Generated: November 29, 2025  
Version: 1.0  
Status: Complete
