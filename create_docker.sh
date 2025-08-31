#!/bin/bash

sudo docker build -t motorsport-agent .
sudo docker run -it --name motorsport-agent-dev -v $(pwd):/app -p 5000:5000 -p 8000:8000 -p 3000:3000 motorsport-agent /bin/bash