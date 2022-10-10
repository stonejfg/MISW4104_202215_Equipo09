/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-var-requires */
const execShPromise = require("exec-sh").promise;

let fs = require("fs");

const projects = [
  { name: "MISW4104_202215_Equipo06" },
  { name: "MISW4104_202215_Equipo07" },
  { name: "MISW4104_202215_Equipo08" },
  { name: "MISW4104_202215_Equipo09" },
  { name: "MISW4104_202215_Equipo10" },
  { name: "MISW4104_202215_Equipo11" },
  { name: "MISW4104_202215_Equipo12" },
  { name: "MISW4104_202215_Equipo13" },
  { name: "MISW4104_202215_Equipo14" },
  { name: "MISW4104_202215_Equipo15" },
  { name: "MISW4104_202215_Equipo16" },
  { name: "MISW4104_202215_Equipo17" },
  { name: "MISW4104_202215_Equipo18" },
  { name: "MISW4104_202215_Equipo19" },
  { name: "MISW4104_202215_Equipo20" },
  { name: "MISW4104_202215_Equipo21" },
  { name: "MISW4104_202215_Equipo22" },
  { name: "MISW4104_202215_Equipo23" },
  { name: "MISW4104_202215_Equipo24" },
  { name: "MISW4104_202215_Equipo25" },
  { name: "MISW4104_202215_Equipo26" },
  { name: "MISW4104_202215_Equipo27" },
  { name: "MISW4104_202215_Equipo28" },
  { name: "MISW4104_202215_Equipo29" },
  { name: "MISW4104_202215_Equipo30" },
  { name: "MISW4104_202215_Equipo31" },
  { name: "MISW4104_202215_Equipo32" },
  { name: "MISW4104_202215_Equipo33" },
  { name: "MISW4104_202215_Equipo34" },
  { name: "MISW4104_202215_Equipo35" },
  { name: "MISW4104_202215_Equipo36" },
];

const config = {
  organization: "MISW-4104-Web",
  gitKey: "277a9d46-cf19-4119-afd9-4054a7d35151",
  sonarServer: "sonar-misovirtual",
  jenkinsServer: "jenkins-misovirtual",
};

const createRepos = async () => {
  let out;
  try {
    for (const project of projects) {
      const jenkinsFile = getJenkinsFile(project.name);
      const sonarFile = getSonarFile(project.name);
      const readmeFile = getReadmeFile(project.name);

      fs.writeFileSync("Jenkinsfile", jenkinsFile);
      fs.writeFileSync("sonar-project.properties", sonarFile);
      fs.writeFileSync("README.md", readmeFile);

      let command1 = `git remote rm origin &&
        hub create ${config.organization}/${project.name}
        git add . &&
        git commit -m "Update Jenkinsfile" &&
        git push origin master`;

      console.log("Creating repo: ", project.name);
      out = await execShPromise(command1, true);
    }
  } catch (e) {
    console.log("Error: ", e);
    console.log("Stderr: ", e.stderr);
    console.log("Stdout: ", e.stdout);
    return e;
  }
  console.log("out: ", out.stdout, out.stderr);
};

createRepos();

function getReadmeFile(repo) {
  const content = `# Enlaces
  - [Jenkins](http://157.253.238.75:8080/${config.jenkinsServer}/)
  - [Sonar](http://157.253.238.75:8080/${config.sonarServer}/)`;

  return content;
}

function getSonarFile(repo) {
  const content = `sonar.host.url=http://157.253.238.75:8080/${config.sonarServer}/
  sonar.projectKey=${repo}:sonar
  sonar.projectName=${repo}
  sonar.projectVersion=1.0
  sonar.sources=src/app
  sonar.test=src/app
  sonar.test.inclusions=**/*.spec.ts
  sonar.exclusions=**/*.module.ts, **/utils/**
  sonar.ts.tslint.configPath=tslint.json
  sonar.javascript.lcov.reportPaths=coverage/front/lcov.info
  sonar.testExecutionReportPaths=reports/ut_report.xml`;

  return content;
}

function getJenkinsFile(repo) {
  const content = `pipeline {
    agent any
    environment {
       GIT_REPO = '${repo}'
       GIT_CREDENTIAL_ID = '${config.gitKey}'
       SONARQUBE_URL = '${config.jenkinsServer}'
    }
    stages {
       stage('Checkout') {
          steps {
             scmSkip(deleteBuild: true, skipPattern:'.*\\\\[ci-skip\\\\].*')

             git branch: 'master',
                credentialsId: env.GIT_CREDENTIAL_ID,
                url: 'https://github.com/${config.organization}/' + env.GIT_REPO
          }
       }
       stage('Git Analysis') {
          // Run git analysis
          steps {
             script {
                docker.image('gitinspector-isis2603').inside('--entrypoint=""') {
                   sh '''
                      mkdir -p ./reports/
                      datetime=$(date +'%Y-%m-%d_%H%M%S')
                      gitinspector --file-types="cs,js,asax,ascx,asmx,aspx,html,fs,ts" --format=html --RxU -w -T -x author:Bocanegra -x author:estudiante > ./reports/index.html
                   '''
                }
             }
             withCredentials([usernamePassword(credentialsId: env.GIT_CREDENTIAL_ID, passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
                sh('git config --global user.email "ci-isis2603@uniandes.edu.co"')
                sh('git config --global user.name "ci-isis2603"')
                sh('git add ./reports/index.html')
                sh('git commit -m "[ci-skip] GitInspector report added"')
                sh('git pull https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/${config.organization}/\${GIT_REPO} master')
                sh('git push https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/${config.organization}/\${GIT_REPO} master')
             }
          }
       }
       stage('Build') {
          // Build app
          steps {
             script {
                docker.image('citools-isis2603:latest').inside('-u root') {
                   sh '''
                      CYPRESS_INSTALL_BINARY=0 npm install
                      npm i -s
                      npm i typescript@4.6.2
                      ng build
                   '''
                }
             }
          }
       }
      stage('Test') {
          steps {
             script {
                docker.image('citools-isis2603:latest').inside('-u root') {
                   sh '''
                      ng test --watch=false --code-coverage true
                      npm run sonar
                   '''
                }
             }
          }
       }
       stage('Static Analysis') {
          // Run static analysis
          steps {
             sh '''
                docker run --rm -u root -e SONAR_HOST_URL=\${SONARQUBE_URL} -v \${WORKSPACE}:/usr/src sonarsource/sonar-scanner-cli:4.3
             '''
          }
       }
    }
    post {
       always {
          // Clean workspace
          cleanWs deleteDirs: true
       }
    }
  }
  `;
  return content;
}
