# [Drink!t] 주류 쇼핑몰 프로젝트
- 기본적인 주류 쇼핑몰 + 구독 서비스
- 혼술러를 위한 술친구 찾기 WebRTC를 사용해 구현한 화상채팅
- AI 챗봇을 이용한 고객센터

## 🍀 URL
- 서비스 URL : https://drinkit.site/
- Github URL : https://github.com/Drinkit-project
    - backend : https://github.com/Drinkit-project/Develop-Drinkit
    - frontend : https://github.com/Drinkit-project/Drinkit_frontend
    - webRTC : https://github.com/Drinkit-project/Drinkit-webRTC
    - openAPI : https://github.com/Drinkit-project/Drinkit-openAi

## 🍀 주요 기술
- Nest.js 10, React 18.2
- webRTC, socket.io
- PostgreSQL
- Redis
- RDS Read Replica
- Elastic search
- Open AI

## 🏗 아키텍쳐
![drinkit 서비스 아키텍쳐.png](https://res.cloudinary.com/dyhnnmhcf/image/upload/v1695829626/drinkit_%E1%84%89%E1%85%A5%E1%84%87%E1%85%B5%E1%84%89%E1%85%B3_%E1%84%8B%E1%85%A1%E1%84%8F%E1%85%B5%E1%84%90%E1%85%A6%E1%86%A8%E1%84%8E%E1%85%A7_vql9jj.png)

  - 아키텍쳐 도입 배경
    - Load Balancer
        - 대용량 트래픽을 고려해, 기본적으로 많이 사용되는 서버에 부하를 줄이기 위한 로드 밸런서를 활용 ->
        트래픽을 분산시키고자 도입하게 됐습니다. 트래픽을 나누는 알고리즘은 요청의 중요도가 대부분 비슷하고, 무거운 요청 또한 없기 때문에 라운드 로빈 방식을 선택하였습니다.
        
    - React
        - 리액트는 가상 DOM을 통해서 효율적인 렌더링을 제공해서 웹의 성능을 향상시켜주고, 컴포넌트를 기반으로 코드의 재사용성을 높혀 유지보수에 용이하고 다양한 라이브러리, 도구나 컴포넌트를 활용해서 개발 생산성을 향상시키고 다양한 기능을 빠르게 적용 할 수 있어 리액트를 선택했습니다.
        
    - Redis
        - In-memory 방식의 서버로 데이터를 캐싱해두어 요청이 자주 일어나는 것에 대해 빠른 응답을 해줄수있게 했습니다. refreshToken 이나 채팅방 목록과 같은 민감한 데이터를 담지 않는 선에서 처리를 하였으며, key-value 형태로 JSON 객체를 저장할수도 있고, 기본적으로 Redis 같은경우 O(1)의 복잡도를 가지나 JSON 같은 경우 O(N*M)이며 자료의 깊이와 자료의 넓이를 곱한 값입니다. 
        
    - webRTC
        - 고객끼리의 영상 채팅 서비스를 구현하며 webRTC를 도입하게 됐는데, webRTC는 실시간 음성, 비디오 통신을 웹에서 사용할 때 별도의 설정없이 브라우저에서 실시간 소통이 가능하게 합니다. 시그널링 서버를 사용해서 피어간의 연결을 돕고 연결된 피어끼리 데이터를 교환 하는 방식을 사용하면 서버의 부담이 줄고 피어간의 빠른 데이터의 교환이 가능한 메쉬방식을 선택했습니다.
        
    - openAI
        - 고객센터의 자동 응대를 위해 도입하였습니다. 학습시킨 내용을 기반으로 사용자의 질문에 대하여 유연하게 답할 수 있으며, 체인 방식을 활용하여 간단한 주류 추천, 질문 등 사용자가 다방면으로 활용하여 고객 만족도를 높일 수 있을 것이라 생각했습니다. 
        
    - openSearch
        - 자동완성 기능을 추가함에 있어서 좀 더 쾌적한 환경을 위해 Elastic Search를 도입하려 했습니다. 하지만 트래픽 분산을 위하여 서버를 세분화한 상태였고 서버 자원을 좀 더 절약할 필요성을 느꼈습니다. 이 문제를 해결하기 위해서 별개의 저장소를 제공해주는 Elastic Search기반 서비스인 openSearch를 선택했습니다.
        
    - RDS Read Replica
        - 요청의 비중을 고려했을 때, 읽기 요청의 비중이 가장 클 것으로 판단했습니다. 메인 DB에 가해지는 요청을 분산할 필요가 있었고, 추가적으로 메인 DB가 다운됐을 경우를 상정하여 가용성을 확보해야할 필요도 있었습니다. 이 문제들에 대해서 Read Replica를 채용하여 DB 요청을 분산시키고 메인 DB가 정상작동 하지 않을 때, Read Replica를 승격시켜 해당 문제를 해결하였습니다.
        

## 🏗 ERD
![drawSQL-drinkit-export-2023-09-27.png](https://res.cloudinary.com/dyhnnmhcf/image/upload/v1695829631/drawSQL-drinkit-export-2023-09-27_w6uktr.png)

## 🔎 주요기능
- 상품 픽업 서비스
    
    사용자의 주소 기반 근처에 위치한 가게들 재고파악
     → 네이버 지도 api로 픽업 가게 선택 → 결제
    
- 바텐더 챗봇
    1. 자동화된 고객센터와 여담을 나누거나 간략한 질문 등을 할 수 있는 챗봇.
    택배, 환불, 픽업, 구독, drinkit 서비스 등 AI에 학습시킨 내용을 기반으로 답변
    2. 채팅 탭 가장 좌측에 존재하는 빠른 질문의 경우, 
    버튼을 차례대로 클릭하여 빠르게 AI에게 질문을 생성하여 요청 가능
    
    챗봇 기능의 경우 chain방식을 통하여 이전 대화 내용을 기억하고 사용자와의 대화를 이어갑니다.
    
- 자동완성
    - Elastic Search를 통하여 입력한 단어에 반응하여 관련 상품들을 표시
    - 표시된 상품을 클릭할 경우, 상품 상세보기 페이지로 이동
    
- 간편결제
    
    상품 구매, 포인트 충전 시 카카오톡 간편결제(테스트 결제)를 통하여 손쉬운 결제
    
- 구독 서비스
    
    매 월 20일, 구독자에게 배송 될 주류를 공개 
    구독자의 경우, 자동 결제 처리와 함께 구독 상품 구매 처리가 완료됩니다. 
    상품이 마음에 들지 않을 경우 보류 가능
    → 해당 월 상품 결제 X
    
- 화상채팅(ZZAN)

    2~4인 방 화상채팅 기능
    PeerJS, Socket.io를 사용해서 구현
    

## 🛠 트러블슈팅
- HTTPS 배포 관련
    
    Load Balancer
    
    서버자체에서 https 암복호화 처리를 하는 것이 아닌 Load Balancer에서 처리 
    서버의 자원을 추가 소모할 필요 없이 Load Balancer에서 해당 로직을 수행하고, 
    복호화 된 데이터를 서버로 전송하는 방식으로 https 연결
    
- webRTC
    
    Peer 연결 후 실시간 통신 중에 연결된 사용자가 브라우저를 닫거나 해당 페이지를 새로고침하면 연결중이던 사용자의 Peer에서 끊어진 연결을 인식하지 못하고 연결되었던 피어의 mediaStream을 재생하는 Video나 오디오를 제거하지 못하는 이슈
    
    **->** 모든 끊김 처리를 잡는게 가능한 NestGateway의 handleDisconnect를 사용
    
- 자동완성 데이터 일관성 유지
    
    openSearch를 도입하고 DB와의 데이터 일관성을 유지시킬 방법에 대해서 고민을 했었습니다. Elastic Search의 경우 Logtash등을 활용하여 데이터를 유지하지만 openSearch의 경우 데이터를 직접 관리해줄 필요가 있었습니다. 이에 대한 해결책으로 Cron을 사용하여 일정 시간마다 DB와 openSearch의 데이터를 비교하고 데이터가 불일치 할 경우, 해당 부분을 변경시켜주는 방식으로 데이터 일관성을 유지할 수 있었습니다.