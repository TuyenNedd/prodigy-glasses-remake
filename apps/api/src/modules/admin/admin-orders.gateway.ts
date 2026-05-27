import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/admin/orders',
  cors: { origin: '*', credentials: true },
})
export class AdminOrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AdminOrdersGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // First-message auth via Socket.IO `auth` payload
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no auth token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      // Only ADMIN can connect
      if (payload.role !== 'ADMIN') {
        this.logger.warn(`Client ${client.id} rejected: not admin (role=${payload.role})`);
        client.disconnect();
        return;
      }

      // Attach user info to socket data
      (client as unknown as { data: { userId: string; role: string } }).data = {
        userId: payload.sub,
        role: payload.role,
      };

      this.logger.log(`Admin ${payload.sub} connected to orders feed (${client.id})`);
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit new order event to all connected admin clients.
   * Called from OrderService after order creation.
   */
  emitNewOrder(order: {
    id: string;
    userId: string;
    totalPrice: number;
    status: string;
    createdAt: Date;
  }) {
    this.server.emit('new-order', order);
    this.logger.log(`Emitted new-order event: ${order.id}`);
  }
}
