use axum::{
    Extension, Router,
    extract::{
        Path, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::IntoResponse,
    routing::get,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, net::SocketAddr, path::PathBuf, sync::Arc};
use tokio::sync::{
    RwLock,
    mpsc::{self, UnboundedReceiver, UnboundedSender},
};
use tower_http::{cors::CorsLayer, services::ServeDir};

type Users = Arc<RwLock<HashMap<usize, UnboundedSender<Message>>>>;
static NEXT_USERID: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(1);

#[derive(Serialize, Deserialize)]
struct Msg {
    name: String,
    uid: Option<usize>,
    message: String,
}

#[tokio::main]
async fn main() {
   // Your code:
let port = std::env::var("PORT").unwrap_or_else(|_| "1000".to_string());
let addr = format!("0.0.0.0:{}", port);



    let static_folder = PathBuf::from("static");

    let app = router(static_folder);

    println!("Backend listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn router(static_folder: PathBuf) -> Router {
    let users = Users::default();

    // Standard static file serving
    let static_assets = Router::new().nest_service("/", ServeDir::new(static_folder));

    Router::new()
        .route("/ws", get(ws_handler))
        // Simple admin route without token checks
        .route("/disconnect/:user_id", get(disconnect_user))
        .layer(Extension(users))
        .layer(CorsLayer::permissive()) // Allows React to connect easily
        .merge(static_assets)
}

async fn ws_handler(ws: WebSocketUpgrade, Extension(state): Extension<Users>) -> impl IntoResponse {
    println!("websocket looks like: {:?}", ws);
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(stream: WebSocket, state: Users) {
     println!("upgraded stream looks like: {:?}", stream);

    let my_id = NEXT_USERID.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let (mut sender, mut receiver) = stream.split();

   

    println!("my id is: {}", my_id);

    let (tx, mut rx): (UnboundedSender<Message>, UnboundedReceiver<Message>) =
        mpsc::unbounded_channel();

    println!("tx and rx are: {:?}, {:?}", tx, rx);

    // Background task to send messages to the client
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
        let _ = sender.close().await;
    });

    state.write().await.insert(my_id, tx);

    // Listen for incoming messages and broadcast them
    while let Some(Ok(result)) = receiver.next().await {
        if let Ok(result) = enrich_result(result, my_id) {
            broadcast_msg(result, &state).await;
        }
    }

    disconnect(my_id, &state).await;
}

fn enrich_result(result: Message, id: usize) -> Result<Message, serde_json::Error> {
    match result {
        Message::Text(msg) => {
            let mut msg: Msg = serde_json::from_str(&msg)?;
            msg.uid = Some(id);
            let msg = serde_json::to_string(&msg)?;
            Ok(Message::Text(msg))
        }
        _ => Ok(result),
    }
}

async fn broadcast_msg(msg: Message, users: &Users) {
    if let Message::Text(msg) = msg {
        let users_guard = users.read().await;
        for (&_uid, tx) in users_guard.iter() {
            // This sends to everyone including the sender
            let _ = tx.send(Message::Text(msg.clone()));
        }
    }
}

async fn disconnect_user(
    Path(user_id): Path<usize>,
    Extension(users): Extension<Users>,
) -> impl IntoResponse {
    disconnect(user_id, &users).await;
    format!("User {} disconnected", user_id)
}

async fn disconnect(my_id: usize, users: &Users) {
    users.write().await.remove(&my_id);
    println!("Disconnected user {}", my_id);
}
